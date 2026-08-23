import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { env } from '../config/env'
import { merchants, merchantStaff, rewards, authUsers, user, stampTransactions, merchantPublic } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { getMerchantDashboard, getMerchantCustomers, getMerchantTransactions } from '../services/analytics'
import { generateSecret } from '../services/totp'
import { getOrCreateCard } from '../services/stamp'
import type { AppVariables } from '../types/app'

export const businessRoutes = new Hono<{ Variables: AppVariables }>()

businessRoutes.use('*', requireAuth())
businessRoutes.use('*', requireRole('business'))

businessRoutes.get('/referral', async (c) => {
  const userId = c.get('userId')!
  const [merchant] = await db
    .select({ id: merchants.id, name: merchants.name, slug: merchants.slug })
    .from(merchants)
    .where(eq(merchants.ownerId, userId))
    .limit(1)
  if (!merchant) return c.json({ error: 'No merchant found' }, 404)
  const base = env.frontendUrl.replace(/\/+$/, '')
  const url = `${base}/?ref=${encodeURIComponent(merchant.slug)}`
  return c.json({ url, slug: merchant.slug, name: merchant.name, merchantId: merchant.id })
})

async function getMerchantForUser(userId: string) {
  const [staff] = await db
    .select({ merchantId: merchantStaff.merchantId, staffRole: merchantStaff.role })
    .from(merchantStaff)
    .where(and(eq(merchantStaff.userId, userId), eq(merchantStaff.role, 'owner')))
    .limit(1)
  return staff
}

businessRoutes.get('/dashboard', async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const daysParam = Number(c.req.query('days'))
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 14

  const dashboard = await getMerchantDashboard(staff.merchantId, days)
  return c.json({ dashboard })
})

businessRoutes.get('/staff', async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const staffList = await db
    .select({
      id: merchantStaff.id,
      userId: merchantStaff.userId,
      role: merchantStaff.role,
      createdAt: merchantStaff.createdAt,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    })
    .from(merchantStaff)
    .innerJoin(user, eq(merchantStaff.userId, user.id))
    .where(eq(merchantStaff.merchantId, staff.merchantId))

  const statsRows = await db
    .select({
      cashierId: stampTransactions.cashierId,
      pointsAwarded: sql<number>`coalesce(sum(case when ${stampTransactions.balanceType} = 'fidelity' and ${stampTransactions.type} = 'ADD_POINTS' then ${stampTransactions.amount} else 0 end), 0)`,
      mealAwarded: sql<number>`coalesce(sum(case when ${stampTransactions.balanceType} = 'meal_voucher' and ${stampTransactions.type} = 'ADD_MEAL_VOUCHER' then ${stampTransactions.amount} else 0 end), 0)`,
      transactionCount: sql<number>`coalesce(count(*), 0)`,
    })
    .from(stampTransactions)
    .where(eq(stampTransactions.merchantId, staff.merchantId))
    .groupBy(stampTransactions.cashierId)

  const statsMap = new Map<string, (typeof statsRows)[number]>()
  for (const r of statsRows) statsMap.set(r.cashierId, r)

  const staffWithStats = staffList.map((s) => {
    const st = statsMap.get(s.userId)
    return {
      ...s,
      pointsAwarded: st ? Number(st.pointsAwarded) : 0,
      mealAwarded: st ? Number(st.mealAwarded) : 0,
      transactionCount: st ? Number(st.transactionCount) : 0,
    }
  })

  return c.json({ staff: staffWithStats })
})

const recruitSchema = z.object({
  userId: z.string().min(1),
})

businessRoutes.post('/staff/recruit', zValidator('json', recruitSchema), async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const { userId: targetUserId } = c.req.valid('json')

  const [targetUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, targetUserId))
    .limit(1)
  if (!targetUser) return c.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, 404)

  const [existing] = await db
    .select()
    .from(merchantStaff)
    .where(and(eq(merchantStaff.merchantId, staff.merchantId), eq(merchantStaff.userId, targetUserId)))
    .limit(1)
  if (existing) return c.json({ error: 'Already staff', code: 'ALREADY_STAFF' }, 409)

  await db.insert(merchantStaff).values({
    id: crypto.randomUUID(),
    merchantId: staff.merchantId,
    userId: targetUserId,
    role: 'cashier',
  })
  await getOrCreateCard(targetUserId, staff.merchantId)
  await db.update(user).set({ role: 'cashier' }).where(eq(user.id, targetUserId))

  return c.json({ success: true })
})

const addStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'cashier']).default('cashier'),
})

businessRoutes.post('/staff', zValidator('json', addStaffSchema), async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const { email, role } = c.req.valid('json')

  const [targetUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)
  if (!targetUser) return c.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, 404)

  const [existing] = await db
    .select()
    .from(merchantStaff)
    .where(and(eq(merchantStaff.merchantId, staff.merchantId), eq(merchantStaff.userId, targetUser.id)))
    .limit(1)
  if (existing) return c.json({ error: 'Already staff', code: 'ALREADY_STAFF' }, 409)

  const targetRole = role === 'owner' ? 'business' : 'cashier'
  await db.update(user).set({ role: targetRole }).where(eq(user.id, targetUser.id))

  await db.insert(merchantStaff).values({
    id: crypto.randomUUID(),
    merchantId: staff.merchantId,
    userId: targetUser.id,
    role,
  })
  await getOrCreateCard(targetUser.id, staff.merchantId)

  return c.json({ success: true })
})

businessRoutes.delete('/staff/:userId', async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const targetUserId = c.req.param('userId')
  if (targetUserId === userId) return c.json({ error: 'Cannot remove yourself', code: 'CANNOT_REMOVE_SELF' }, 400)

  await db
    .delete(merchantStaff)
    .where(and(eq(merchantStaff.merchantId, staff.merchantId), eq(merchantStaff.userId, targetUserId)))

  return c.json({ success: true })
})

const updateStaffSchema = z.object({
  role: z.enum(['owner', 'cashier']),
})

businessRoutes.patch('/staff/:userId', zValidator('json', updateStaffSchema), async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const targetUserId = c.req.param('userId')
  const { role } = c.req.valid('json')

  const [targetStaff] = await db
    .select()
    .from(merchantStaff)
    .where(and(eq(merchantStaff.merchantId, staff.merchantId), eq(merchantStaff.userId, targetUserId)))
    .limit(1)
  if (!targetStaff) return c.json({ error: 'Staff not found', code: 'STAFF_NOT_FOUND' }, 404)

  await db
    .update(merchantStaff)
    .set({ role })
    .where(eq(merchantStaff.id, targetStaff.id))

  const targetRole = role === 'owner' ? 'business' : 'cashier'
  await db.update(user).set({ role: targetRole }).where(eq(user.id, targetUserId))

  return c.json({ success: true })
})

businessRoutes.get('/customers', async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const limit = Math.min(parseInt(c.req.query('limit') ?? '100'), 500)
  const cursor = c.req.query('cursor') ? parseInt(c.req.query('cursor')!) : undefined
  const customers = await getMerchantCustomers(staff.merchantId, limit, cursor)
  return c.json({ customers })
})

businessRoutes.get('/transactions', async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const limit = Math.min(parseInt(c.req.query('limit') ?? '50'), 200)
  const cursor = c.req.query('cursor') ? parseInt(c.req.query('cursor')!) : undefined
  const transactions = await getMerchantTransactions(staff.merchantId, limit, cursor)
  return c.json({ transactions })
})

businessRoutes.get('/rewards', async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const rewardsList = await db
    .select()
    .from(rewards)
    .where(eq(rewards.merchantId, staff.merchantId))
    .orderBy(desc(rewards.createdAt))

  return c.json({ rewards: rewardsList })
})

const createRewardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  stampsCost: z.number().int().positive().default(10),
  imageUrl: z.string().optional(),
})

businessRoutes.post('/rewards', zValidator('json', createRewardSchema), async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const body = c.req.valid('json')
  const id = crypto.randomUUID()

  await db.insert(rewards).values({
    id,
    merchantId: staff.merchantId,
    title: body.title,
    description: body.description,
    stampsCost: body.stampsCost,
    imageUrl: body.imageUrl ?? null,
  })

  return c.json({ id, success: true })
})

const updateRewardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  stampsCost: z.number().int().positive().optional(),
  imageUrl: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
})

businessRoutes.patch('/rewards/:id', zValidator('json', updateRewardSchema), async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const rewardId = c.req.param('id')
  const body = c.req.valid('json')

  const [existing] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, rewardId), eq(rewards.merchantId, staff.merchantId)))
    .limit(1)
  if (!existing) return c.json({ error: 'Reward not found', code: 'REWARD_NOT_FOUND' }, 404)

  await db.update(rewards).set(body).where(eq(rewards.id, rewardId))
  return c.json({ success: true })
})

businessRoutes.delete('/rewards/:id', async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const rewardId = c.req.param('id')
  const [existing] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, rewardId), eq(rewards.merchantId, staff.merchantId)))
    .limit(1)
  if (!existing) return c.json({ error: 'Reward not found', code: 'REWARD_NOT_FOUND' }, 404)

  await db.delete(rewards).where(eq(rewards.id, rewardId))
  return c.json({ success: true })
})

const settingsSchema = z.object({
  name: z.string().min(1).optional(),
  stampsPerReward: z.number().int().positive().optional(),
  logoUrl: z.string().url().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
})

businessRoutes.patch('/settings', zValidator('json', settingsSchema), async (c) => {
  const userId = c.get('userId')!
  const staff = await getMerchantForUser(userId)
  if (!staff) return c.json({ error: 'No merchant found', code: 'NO_MERCHANT' }, 404)

  const body = c.req.valid('json')
  await db.update(merchants).set({ ...body, updatedAt: new Date() }).where(eq(merchants.id, staff.merchantId))

  const [updated] = await db.select(merchantPublic).from(merchants).where(eq(merchants.id, staff.merchantId)).limit(1)
  return c.json({ merchant: updated })
})
