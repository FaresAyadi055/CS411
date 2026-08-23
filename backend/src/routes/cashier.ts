import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { merchantStaff, merchants, rewards, merchantPublic } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { verifyQr, adjustBalance } from '../services/stamp'
import { AppError } from '../lib/errors'
import type { AppVariables } from '../types/app'

export const cashierRoutes = new Hono<{ Variables: AppVariables }>()

cashierRoutes.use('*', requireAuth())
cashierRoutes.use('*', requireRole('cashier', 'business'))

const verifySchema = z.object({
  qrPayload: z.string().min(1),
})

cashierRoutes.post('/verify', zValidator('json', verifySchema), async (c) => {
  const userId = c.get('userId')!
  const { qrPayload } = c.req.valid('json')

  try {
    const result = await verifyQr(qrPayload, userId)
    return c.json(result)
  } catch (err) {
    if (err instanceof AppError) {
      return c.json({ error: err.message, code: err.code }, err.status as 400 | 403 | 409)
    }
    console.error('[Verify] Unexpected error:', err)
    return c.json({ error: (err as Error)?.message || 'Verify failed', code: 'VERIFY_ERROR' }, 500)
  }
})

const adjustSchema = z.object({
  customerId: z.string().min(1),
  balanceType: z.enum(['fidelity', 'meal_voucher']),
  amount: z
    .number()
    .refine((v) => v !== 0, 'Amount cannot be zero')
    .refine((v) => Math.abs(v) <= 1_000_000, 'Amount too large'),
})

cashierRoutes.post('/adjust', zValidator('json', adjustSchema), async (c) => {
  const userId = c.get('userId')!
  const { customerId, balanceType, amount } = c.req.valid('json')

  try {
    const result = await adjustBalance(userId, customerId, balanceType, amount)
    return c.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof AppError) {
      return c.json({ error: err.message, code: err.code }, err.status as 400 | 403 | 409)
    }
    console.error('[Adjust] Unexpected error:', err)
    return c.json({ error: (err as Error)?.message || 'Adjust failed', code: 'ADJUST_ERROR' }, 500)
  }
})

cashierRoutes.get('/merchant', async (c) => {
  const userId = c.get('userId')!
  const [staff] = await db
    .select({ merchantId: merchantStaff.merchantId })
    .from(merchantStaff)
    .where(eq(merchantStaff.userId, userId))
    .limit(1)

  if (!staff) return c.json({ error: 'Not staff', code: 'NOT_STAFF' }, 404)

  const [merchant] = await db
    .select(merchantPublic)
    .from(merchants)
    .where(eq(merchants.id, staff.merchantId))
    .limit(1)

  return c.json({ merchant })
})

cashierRoutes.get('/rewards', async (c) => {
  const userId = c.get('userId')!
  const [staff] = await db
    .select({ merchantId: merchantStaff.merchantId })
    .from(merchantStaff)
    .where(eq(merchantStaff.userId, userId))
    .limit(1)

  if (!staff) return c.json({ error: 'Not staff', code: 'NOT_STAFF' }, 404)

  const rewardsList = await db
    .select({
      id: rewards.id,
      title: rewards.title,
      description: rewards.description,
      stampsCost: rewards.stampsCost,
      imageUrl: rewards.imageUrl,
    })
    .from(rewards)
    .where(and(eq(rewards.merchantId, staff.merchantId), eq(rewards.isAvailable, true)))

  return c.json({ rewards: rewardsList })
})

const redeemSchema = z.object({
  customerId: z.string().min(1),
  rewardId: z.string().min(1),
})

cashierRoutes.post('/redeem', zValidator('json', redeemSchema), async (c) => {
  const userId = c.get('userId')!
  const { customerId, rewardId } = c.req.valid('json')

  try {
    const [staff] = await db
      .select({ merchantId: merchantStaff.merchantId })
      .from(merchantStaff)
      .where(eq(merchantStaff.userId, userId))
      .limit(1)
    if (!staff) return c.json({ error: 'Not staff', code: 'NOT_STAFF' }, 404)

    const [reward] = await db
      .select()
      .from(rewards)
      .where(and(eq(rewards.id, rewardId), eq(rewards.merchantId, staff.merchantId)))
      .limit(1)
    if (!reward || !reward.isAvailable) {
      return c.json({ error: 'Reward not available', code: 'REWARD_NOT_FOUND' }, 404)
    }

    const result = await adjustBalance(userId, customerId, 'fidelity', -reward.stampsCost, reward.id)
    return c.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof AppError) {
      return c.json({ error: err.message, code: err.code }, err.status as 400 | 403 | 409)
    }
    console.error('[Redeem] Unexpected error:', err)
    return c.json({ error: (err as Error)?.message || 'Redeem failed', code: 'REDEEM_ERROR' }, 500)
  }
})

cashierRoutes.get('/stamps', async (c) => {
  return c.json({ stamps: [] })
})
