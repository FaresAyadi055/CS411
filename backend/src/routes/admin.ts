import { Hono } from 'hono'
import { eq, desc, gte, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { user, rateLimitLog, authUsers, merchants, merchantStaff, merchantStaff as staffTable } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { generateSecret } from '../services/totp'
import { getOrCreateCard } from '../services/stamp'
import type { AppVariables } from '../types/app'

export const adminRoutes = new Hono<{ Variables: AppVariables }>()

adminRoutes.use('*', requireAuth(), requireRole('admin'))

adminRoutes.get('/stats', async (c) => {
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()

  const [[{ users }], [{ admins }], [{ newUsers24h }], [{ rateLimited24h }]] =
    await Promise.all([
      db.select({ users: sql<number>`count(*)` }).from(user),
      db.select({ admins: sql<number>`count(*)` }).from(user).where(eq(user.role, 'admin')),
      db.select({ newUsers24h: sql<number>`count(*)` }).from(user).where(gte(user.createdAt, dayAgo)),
      db.select({ rateLimited24h: sql<number>`count(*)` }).from(rateLimitLog).where(gte(rateLimitLog.triggeredAt, dayAgo)),
    ])

  return c.json({ users, admins, newUsers24h, rateLimited24h })
})

adminRoutes.get('/users', async (c) => {
  const rows = await db
    .select({
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      locale: user.locale,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(500)
  return c.json({ users: rows })
})

adminRoutes.get('/users/:id', async (c) => {
  const [row] = await db.select().from(user).where(eq(user.id, c.req.param('id'))).limit(1)
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ user: row })
})

const userPatchSchema = z.object({
  role: z.enum(['client', 'cashier', 'business', 'admin']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().nullable().optional(),
  locale: z.enum(['en', 'fr', 'ar']).optional(),
})

adminRoutes.patch('/users/:id', zValidator('json', userPatchSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  await db
    .update(user)
    .set({ ...body, lastUpdated: new Date().toISOString() })
    .where(eq(user.id, id))
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  return c.json({ user: row })
})

adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(authUsers).where(eq(authUsers.id, id))
  return c.json({ ok: true })
})

adminRoutes.get('/rate-limits', async (c) => {
  const rows = await db
    .select()
    .from(rateLimitLog)
    .orderBy(desc(rateLimitLog.triggeredAt))
    .limit(100)
  return c.json({ items: rows })
})

// --- Merchant Management ---

adminRoutes.get('/merchants', async (c) => {
  const rows = await db
    .select({
      id: merchants.id,
      ownerId: merchants.ownerId,
      name: merchants.name,
      slug: merchants.slug,
      planTier: merchants.planTier,
      monthlyPointCap: merchants.monthlyPointCap,
      pointsUsedMonth: merchants.pointsUsedMonth,
      isActive: merchants.isActive,
      createdAt: merchants.createdAt,
    })
    .from(merchants)
    .orderBy(desc(merchants.createdAt))
  return c.json({ merchants: rows })
})

const createMerchantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  ownerEmail: z.string().email(),
  stampsPerReward: z.number().int().positive().default(10),
  planTier: z.enum(['starter', 'growth', 'pro']).default('starter'),
  monthlyPointCap: z.number().int().positive().default(300),
})

adminRoutes.post('/merchants', zValidator('json', createMerchantSchema), async (c) => {
  const body = c.req.valid('json')

  const [owner] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, body.ownerEmail))
    .limit(1)
  if (!owner) return c.json({ error: 'Owner not found', code: 'USER_NOT_FOUND' }, 404)

  const [existingSlug] = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(eq(merchants.slug, body.slug))
    .limit(1)
  if (existingSlug) return c.json({ error: 'Slug already taken', code: 'SLUG_TAKEN' }, 409)

  const merchantId = crypto.randomUUID()
  const hmacKey = generateSecret()

  await db.insert(merchants).values({
    id: merchantId,
    ownerId: owner.id,
    name: body.name,
    slug: body.slug,
    stampsPerReward: body.stampsPerReward,
    planTier: body.planTier,
    monthlyPointCap: body.monthlyPointCap,
    secretHmacKey: hmacKey,
  })

  await db.insert(staffTable).values({
    id: crypto.randomUUID(),
    merchantId,
    userId: owner.id,
    role: 'owner',
  })

  await getOrCreateCard(owner.id, merchantId)

  await db.update(user).set({ role: 'business' }).where(eq(user.id, owner.id))

  return c.json({ id: merchantId, success: true })
})

adminRoutes.get('/merchants/:id', async (c) => {
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, c.req.param('id')))
    .limit(1)
  if (!merchant) return c.json({ error: 'Not found' }, 404)
  return c.json({ merchant })
})

const updateMerchantSchema = z.object({
  name: z.string().min(1).optional(),
  stampsPerReward: z.number().int().positive().optional(),
  planTier: z.enum(['starter', 'growth', 'pro']).optional(),
  monthlyPointCap: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

adminRoutes.patch('/merchants/:id', zValidator('json', updateMerchantSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  await db.update(merchants).set({ ...body, updatedAt: new Date() }).where(eq(merchants.id, id))
  const [row] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1)
  return c.json({ merchant: row })
})

adminRoutes.delete('/merchants/:id', async (c) => {
  const id = c.req.param('id')
  await db.update(merchants).set({ isActive: false, updatedAt: new Date() }).where(eq(merchants.id, id))
  return c.json({ ok: true })
})

adminRoutes.get('/merchants/:id/staff', async (c) => {
  const merchantId = c.req.param('id')
  const rows = await db
    .select({
      id: staffTable.id,
      userId: staffTable.userId,
      role: staffTable.role,
      createdAt: staffTable.createdAt,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    })
    .from(staffTable)
    .innerJoin(user, eq(staffTable.userId, user.id))
    .where(eq(staffTable.merchantId, merchantId))
  return c.json({ staff: rows })
})

adminRoutes.get('/merchants/:id/stats', async (c) => {
  const merchantId = c.req.param('id')
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1)
  if (!merchant) return c.json({ error: 'Not found' }, 404)

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(merchantStaff)
    .where(eq(merchantStaff.merchantId, merchantId))

  return c.json({
    merchant: {
      id: merchant.id,
      name: merchant.name,
      pointsUsedMonth: merchant.pointsUsedMonth,
      monthlyPointCap: merchant.monthlyPointCap,
    },
    staffCount: customerCount?.count ?? 0,
  })
})