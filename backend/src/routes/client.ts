import { Hono } from 'hono'
import { eq, and, desc, or } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { authUsers, customerCards, merchantStaff, merchants, stampTransactions, rewards, merchantSubscriptions } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { generateSecret, generateTotp, buildQrPayload, PERIOD } from '../services/totp'
import type { AppVariables } from '../types/app'

export const clientRoutes = new Hono<{ Variables: AppVariables }>()

clientRoutes.use('*', requireAuth())
clientRoutes.use('*', requireRole('client', 'cashier', 'business', 'admin'))

clientRoutes.post(
  '/subscribe',
  zValidator('json', z.object({ merchantId: z.string().min(1) })),
  async (c) => {
    const userId = c.get('userId')!
    const { merchantId } = c.req.valid('json')

    const [merchant] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(or(eq(merchants.id, merchantId), eq(merchants.slug, merchantId)))
      .limit(1)
    if (!merchant) return c.json({ error: 'Merchant not found' }, 404)

    await db
      .insert(merchantSubscriptions)
      .values({ id: crypto.randomUUID(), userId, merchantId: merchant.id, createdAt: new Date() })
      .onConflictDoNothing()

    const now = new Date()
    await db
      .insert(customerCards)
      .values({
        id: crypto.randomUUID(),
        customerId: userId,
        merchantId: merchant.id,
        fidelityPoints: 0,
        mealVoucherBalance: 0,
        lifetimePoints: 0,
        mealVoucherTotal: 0,
        lastVisitAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()

    return c.json({ success: true, merchantId: merchant.id })
  },
)

clientRoutes.post('/qr/provision', async (c) => {
  const userId = c.get('userId')!
  const [existing] = await db
    .select({ totpSecret: authUsers.totpSecret })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)

  if (existing?.totpSecret) {
    return c.json({ error: 'Already provisioned', code: 'ALREADY_PROVISIONED' }, 409)
  }

  const secret = generateSecret()
  await db.update(authUsers).set({ totpSecret: secret }).where(eq(authUsers.id, userId))

  const totp = await generateTotp(secret)
  const payload = buildQrPayload(userId, totp)
  const qrDataUri = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="12">${payload}</text></svg>`)}`

  return c.json({
    secret,
    totp,
    payload,
    qrDataUri,
    refreshInterval: PERIOD,
  })
})

clientRoutes.get('/qr/current', async (c) => {
  const userId = c.get('userId')!
  const [existing] = await db
    .select({ totpSecret: authUsers.totpSecret })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)

  if (!existing?.totpSecret) {
    return c.json({ error: 'Not provisioned. Call POST /qr/provision first.', code: 'NOT_PROVISIONED' }, 400)
  }

  const totp = await generateTotp(existing.totpSecret)
  const payload = buildQrPayload(userId, totp)
  const qrDataUri = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="12">${payload}</text></svg>`)}`

  const nowSec = Math.floor(Date.now() / 1000)
  const remaining = PERIOD - (nowSec % PERIOD)

  return c.json({
    totp,
    payload,
    qrDataUri,
    refreshInterval: PERIOD,
    remainingSeconds: remaining,
  })
})

clientRoutes.get('/cards', async (c) => {
  const userId = c.get('userId')!
  const cards = await db
    .select({
      id: customerCards.id,
      merchantId: customerCards.merchantId,
      merchantName: merchants.name,
      merchantLogo: merchants.logoUrl,
      fidelityPoints: customerCards.fidelityPoints,
      mealVoucherBalance: customerCards.mealVoucherBalance,
      lifetimePoints: customerCards.lifetimePoints,
      mealVoucherTotal: customerCards.mealVoucherTotal,
      lastVisitAt: customerCards.lastVisitAt,
    })
    .from(customerCards)
    .innerJoin(merchants, eq(customerCards.merchantId, merchants.id))
    .where(eq(customerCards.customerId, userId))
    .orderBy(desc(customerCards.lastVisitAt))

  return c.json({ cards })
})

clientRoutes.get('/cards/:merchantId', async (c) => {
  const userId = c.get('userId')!
  const merchantId = c.req.param('merchantId')

  const [card] = await db
    .select({
      id: customerCards.id,
      merchantId: customerCards.merchantId,
      merchantName: merchants.name,
      merchantLogo: merchants.logoUrl,
      merchantAddress: merchants.address,
      merchantLat: merchants.lat,
      merchantLng: merchants.lng,
      fidelityPoints: customerCards.fidelityPoints,
      mealVoucherBalance: customerCards.mealVoucherBalance,
      lifetimePoints: customerCards.lifetimePoints,
      mealVoucherTotal: customerCards.mealVoucherTotal,
      lastVisitAt: customerCards.lastVisitAt,
    })
    .from(customerCards)
    .innerJoin(merchants, eq(customerCards.merchantId, merchants.id))
    .where(and(eq(customerCards.customerId, userId), eq(customerCards.merchantId, merchantId)))
    .limit(1)

  if (!card) return c.json({ error: 'Card not found', code: 'CARD_NOT_FOUND' }, 404)

  const txs = await db
    .select()
    .from(stampTransactions)
    .where(and(eq(stampTransactions.customerId, userId), eq(stampTransactions.merchantId, merchantId)))
    .orderBy(desc(stampTransactions.createdAt))
    .limit(30)

  const merchantRewards = await db
    .select({
      id: rewards.id,
      title: rewards.title,
      description: rewards.description,
      stampsCost: rewards.stampsCost,
      imageUrl: rewards.imageUrl,
    })
    .from(rewards)
    .where(and(eq(rewards.merchantId, merchantId), eq(rewards.isAvailable, true)))

  const rewardsWithStatus = merchantRewards.map((r) => ({
    ...r,
    canRedeem: card.fidelityPoints >= r.stampsCost,
  }))

  return c.json({ card, transactions: txs, rewards: rewardsWithStatus })
})

clientRoutes.get('/transactions', async (c) => {
  const userId = c.get('userId')!
  const txs = await db
    .select({
      id: stampTransactions.id,
      merchantId: stampTransactions.merchantId,
      merchantName: merchants.name,
      type: stampTransactions.type,
      balanceType: stampTransactions.balanceType,
      rewardId: stampTransactions.rewardId,
      rewardTitle: rewards.title,
      amount: stampTransactions.amount,
      createdAt: stampTransactions.createdAt,
    })
    .from(stampTransactions)
    .innerJoin(merchants, eq(stampTransactions.merchantId, merchants.id))
    .leftJoin(rewards, eq(stampTransactions.rewardId, rewards.id))
    .where(eq(stampTransactions.customerId, userId))
    .orderBy(desc(stampTransactions.createdAt))
    .limit(100)

  return c.json({ transactions: txs })
})

clientRoutes.get('/rewards/available', async (c) => {
  const userId = c.get('userId')!
  const customerMerchantIds = await db
    .select({ merchantId: customerCards.merchantId })
    .from(customerCards)
    .where(eq(customerCards.customerId, userId))

  if (customerMerchantIds.length === 0) {
    return c.json({ rewards: [] })
  }

  const merchantIds = customerMerchantIds.map((r) => r.merchantId)
  const availableRewards = await db
    .select({
      id: rewards.id,
      merchantId: rewards.merchantId,
      merchantName: merchants.name,
      title: rewards.title,
      description: rewards.description,
      stampsCost: rewards.stampsCost,
      imageUrl: rewards.imageUrl,
    })
    .from(rewards)
    .innerJoin(merchants, eq(rewards.merchantId, merchants.id))
    .where(eq(rewards.isAvailable, true))

  const customerCardsMap = new Map<string, number>()
  const cards = await db
    .select({ merchantId: customerCards.merchantId, fidelityPoints: customerCards.fidelityPoints })
    .from(customerCards)
    .where(eq(customerCards.customerId, userId))
  for (const card of cards) {
    customerCardsMap.set(card.merchantId, card.fidelityPoints)
  }

  const result = availableRewards
    .filter((r) => merchantIds.includes(r.merchantId))
    .map((r) => ({
      ...r,
      canRedeem: (customerCardsMap.get(r.merchantId) ?? 0) >= r.stampsCost,
    }))

  return c.json({ rewards: result })
})

clientRoutes.get('/merchants', async (c) => {
  const merchantsList = await db
    .select({
      id: merchants.id,
      name: merchants.name,
      logoUrl: merchants.logoUrl,
      address: merchants.address,
      lat: merchants.lat,
      lng: merchants.lng,
    })
    .from(merchants)
    .orderBy(merchants.name)

  return c.json({ merchants: merchantsList })
})
