import { Hono } from 'hono'
import { eq, desc, gte, sql, or, and } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import {
  user,
  rateLimitLog,
  authUsers,
  merchants,
  merchantStaff,
  merchantStaff as staffTable,
  merchantPublic,
  stampTransactions,
  customerCards,
} from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { generateSecret } from '../services/totp'
import { getOrCreateCard, adminAdjustBalance } from '../services/stamp'
import { AppError } from '../lib/errors'
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

  // Guard against destroying financial/audit history. Deleting a user cascades to their
  // stamp_transactions and customer_cards (and triggers an FK error if referenced as a
  // cashier). Block deletion until a product decision is made (soft-delete/anonymize).
  const [txn] = await db
    .select({ id: stampTransactions.id })
    .from(stampTransactions)
    .where(or(eq(stampTransactions.customerId, id), eq(stampTransactions.cashierId, id)))
    .limit(1)
  if (txn) {
    return c.json(
      { error: 'Cannot delete user with transaction history', code: 'USER_HAS_HISTORY' },
      409,
    )
  }
  const [card] = await db
    .select({ id: customerCards.id })
    .from(customerCards)
    .where(eq(customerCards.customerId, id))
    .limit(1)
  if (card) {
    return c.json({ error: 'Cannot delete user with loyalty cards', code: 'USER_HAS_CARDS' }, 409)
  }

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
    .select(merchantPublic)
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
  initialPoints: z.number().int().nonnegative().default(0),
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
    pointsBalance: body.initialPoints,
    pointsFunded: body.initialPoints,
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
    .select(merchantPublic)
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
  isActive: z.boolean().optional(),
})

adminRoutes.patch('/merchants/:id', zValidator('json', updateMerchantSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  await db.update(merchants).set({ ...body, updatedAt: new Date() }).where(eq(merchants.id, id))
  const [row] = await db.select(merchantPublic).from(merchants).where(eq(merchants.id, id)).limit(1)
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
    .select(merchantPublic)
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
      pointsBalance: merchant.pointsBalance,
      pointsFunded: merchant.pointsFunded,
    },
    staffCount: customerCount?.count ?? 0,
  })
})

adminRoutes.get('/merchants/:id/customers', async (c) => {
  const merchantId = c.req.param('id')
  const [merchant] = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1)
  if (!merchant) return c.json({ error: 'Not found' }, 404)

  const notStaff = sql`${customerCards.customerId} NOT IN (SELECT user_id FROM merchant_staff WHERE merchant_id = ${merchantId})`

  const customers = await db
    .select({
      customerId: customerCards.customerId,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      fidelityPoints: customerCards.fidelityPoints,
      mealVoucherBalance: customerCards.mealVoucherBalance,
      lifetimePoints: customerCards.lifetimePoints,
      lastVisitAt: customerCards.lastVisitAt,
    })
    .from(customerCards)
    .innerJoin(user, eq(customerCards.customerId, user.id))
    .where(and(eq(customerCards.merchantId, merchantId), notStaff))
    .orderBy(desc(customerCards.lastVisitAt))
    .limit(500)

  const spentRows = await db
    .select({
      customerId: stampTransactions.customerId,
      spentFidelity: sql<number>`coalesce(sum(case when ${stampTransactions.balanceType} = 'fidelity' and ${stampTransactions.type} in ('REMOVE_POINTS','REDEEM_REWARD') then ${stampTransactions.amount} else 0 end), 0)`,
      spentMeal: sql<number>`coalesce(sum(case when ${stampTransactions.balanceType} = 'meal_voucher' and ${stampTransactions.type} = 'REMOVE_MEAL_VOUCHER' then ${stampTransactions.amount} else 0 end), 0)`,
    })
    .from(stampTransactions)
    .where(eq(stampTransactions.merchantId, merchantId))
    .groupBy(stampTransactions.customerId)

  const spentMap = new Map(spentRows.map((r) => [r.customerId, r]))
  const result = customers.map((cust) => {
    const s = spentMap.get(cust.customerId)
    return { ...cust, spentFidelity: s?.spentFidelity ?? 0, spentMeal: s?.spentMeal ?? 0 }
  })

  return c.json({ customers: result })
})

const adminAdjustSchema = z.object({
  customerId: z.string().min(1),
  balanceType: z.literal('fidelity'),
  amount: z
    .number()
    .refine((v) => v !== 0, 'Amount cannot be zero')
    .refine((v) => Math.abs(v) <= 1_000_000, 'Amount too large'),
})

adminRoutes.post('/merchants/:id/adjust', zValidator('json', adminAdjustSchema), async (c) => {
  const merchantId = c.req.param('id')
  const actorId = c.get('userId')!
  const { customerId, balanceType, amount } = c.req.valid('json')

  try {
    const result = await adminAdjustBalance(actorId, merchantId, customerId, balanceType, amount)
    return c.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof AppError) {
      return c.json({ error: err.message, code: err.code }, err.status as 400 | 403 | 404 | 409)
    }
    console.error('[AdminAdjust] Unexpected error:', err)
    return c.json({ error: (err as Error)?.message || 'Adjust failed', code: 'ADJUST_ERROR' }, 500)
  }
})

const fundMerchantSchema = z.object({
  amount: z.number().int().positive().refine((v) => v <= 10_000_000, 'Amount too large'),
})

adminRoutes.post('/merchants/:id/fund', zValidator('json', fundMerchantSchema), async (c) => {
  const merchantId = c.req.param('id')
  const { amount } = c.req.valid('json')

  const [merchant] = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1)
  if (!merchant) return c.json({ error: 'Not found' }, 404)

  const [row] = await db
    .update(merchants)
    .set({
      pointsBalance: sql`${merchants.pointsBalance} + ${amount}`,
      pointsFunded: sql`${merchants.pointsFunded} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(merchants.id, merchantId))
    .returning({ pointsBalance: merchants.pointsBalance, pointsFunded: merchants.pointsFunded })

  return c.json({ success: true, pointsBalance: row?.pointsBalance, pointsFunded: row?.pointsFunded })
})

adminRoutes.post('/merchants/:id/revoke', zValidator('json', fundMerchantSchema), async (c) => {
  const merchantId = c.req.param('id')
  const { amount } = c.req.valid('json')

  const [merchant] = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1)
  if (!merchant) return c.json({ error: 'Not found' }, 404)

  const [row] = await db
    .update(merchants)
    .set({
      pointsBalance: sql`max(0, ${merchants.pointsBalance} - ${amount})`,
      pointsFunded: sql`max(0, ${merchants.pointsFunded} - ${amount})`,
      updatedAt: new Date(),
    })
    .where(eq(merchants.id, merchantId))
    .returning({ pointsBalance: merchants.pointsBalance, pointsFunded: merchants.pointsFunded })

  return c.json({ success: true, pointsBalance: row?.pointsBalance, pointsFunded: row?.pointsFunded })
})