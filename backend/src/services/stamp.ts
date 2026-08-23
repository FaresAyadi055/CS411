import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  merchants,
  merchantStaff,
  customerCards,
  stampTransactions,
  usedQrSignatures,
  merchantSubscriptions,
  notifications,
  authUsers,
  user,
} from '../db/schema'
import { parseQrPayload, verifyTotp, getSignature } from './totp'
import { jsonError } from '../lib/errors'
import { sendPush } from './push'

export interface VerifyResult {
  customerId: string
  customerName: string
  merchantId: string
  fidelityPoints: number
  mealVoucherBalance: number
  lifetimePoints: number
  mealVoucherTotal: number
}

export interface AdjustResult {
  customerId: string
  merchantId: string
  fidelityPoints: number
  mealVoucherBalance: number
  lifetimePoints: number
  mealVoucherTotal: number
  transactionId: string
}

async function resolveCashierMerchant(cashierId: string) {
  const [row] = await db
    .select({
      merchantId: merchantStaff.merchantId,
      merchantName: merchants.name,
      isActive: merchants.isActive,
      monthlyPointCap: merchants.monthlyPointCap,
      pointsUsedMonth: merchants.pointsUsedMonth,
    })
    .from(merchantStaff)
    .innerJoin(merchants, eq(merchantStaff.merchantId, merchants.id))
    .where(eq(merchantStaff.userId, cashierId))
    .limit(1)

  if (!row) {
    throw jsonError(403, 'Not a staff member of any merchant', 'NOT_STAFF')
  }
  if (!row.isActive) {
    throw jsonError(403, 'Merchant is inactive', 'MERCHANT_INACTIVE')
  }

  return {
    merchantId: row.merchantId,
    merchantName: row.merchantName,
    monthlyPointCap: row.monthlyPointCap,
    pointsUsedMonth: row.pointsUsedMonth,
  }
}

export async function getOrCreateCard(customerId: string, merchantId: string) {
  const [existing] = await db
    .select()
    .from(customerCards)
    .where(
      and(
        eq(customerCards.customerId, customerId),
        eq(customerCards.merchantId, merchantId),
      ),
    )
    .limit(1)

  if (existing) return existing

  const now = new Date()
  const id = crypto.randomUUID()
  const [created] = await db
    .insert(customerCards)
    .values({
      id,
      customerId,
      merchantId,
      fidelityPoints: 0,
      mealVoucherBalance: 0,
      lifetimePoints: 0,
      mealVoucherTotal: 0,
      lastVisitAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning()

  if (created) return created

  const [fallback] = await db
    .select()
    .from(customerCards)
    .where(
      and(
        eq(customerCards.customerId, customerId),
        eq(customerCards.merchantId, merchantId),
      ),
    )
    .limit(1)
  return fallback!
}

export async function verifyQr(
  qrPayloadRaw: string,
  cashierId: string,
): Promise<VerifyResult> {
  const payload = parseQrPayload(qrPayloadRaw)
  if (!payload) {
    throw jsonError(400, 'Invalid QR payload', 'INVALID_QR')
  }

  const [customer] = await db
    .select({ id: authUsers.id, name: authUsers.name, totpSecret: authUsers.totpSecret })
    .from(authUsers)
    .where(eq(authUsers.id, payload.u))
    .limit(1)
  if (!customer) {
    throw jsonError(400, 'Customer not found', 'CUSTOMER_NOT_FOUND')
  }
  if (!customer.totpSecret) {
    throw jsonError(400, 'Customer has no TOTP secret', 'NO_TOTP_SECRET')
  }

  const valid = await verifyTotp(customer.totpSecret, payload.t)
  if (!valid) {
    throw jsonError(400, 'Invalid or expired TOTP code', 'INVALID_TOTP')
  }

  const signature = getSignature(payload.u, payload.ts)
  const insertRes = await db
    .insert(usedQrSignatures)
    .values({
      signature,
      userId: payload.u,
      scannedAt: new Date(),
      expiresAt: new Date(payload.ts + 60_000),
    })
    .onConflictDoNothing()

  if (insertRes.rowsAffected === 0) {
    throw jsonError(409, 'QR code already used', 'QR_REPLAY_DETECTED')
  }

  const { merchantId } = await resolveCashierMerchant(cashierId)

  const card = await getOrCreateCard(payload.u, merchantId)

  return {
    customerId: payload.u,
    customerName: customer.name,
    merchantId,
    fidelityPoints: card.fidelityPoints,
    mealVoucherBalance: card.mealVoucherBalance,
    lifetimePoints: card.lifetimePoints,
    mealVoucherTotal: card.mealVoucherTotal,
  }
}

export async function adjustBalance(
  cashierId: string,
  customerId: string,
  balanceType: 'fidelity' | 'meal_voucher',
  amount: number,
  rewardId?: string | null,
): Promise<AdjustResult> {
  const { merchantId, merchantName, monthlyPointCap, pointsUsedMonth } = await resolveCashierMerchant(cashierId)

  if (amount === 0) {
    throw jsonError(400, 'Amount cannot be zero', 'INVALID_AMOUNT')
  }

  const isRemove = amount < 0
  const absAmount = Math.abs(amount)

  const card = await getOrCreateCard(customerId, merchantId)

  const now = new Date()

  if (balanceType === 'fidelity') {
    if (!isRemove) {
      const capUpd = await db
        .update(merchants)
        .set({
          pointsUsedMonth: sql`${merchants.pointsUsedMonth} + ${absAmount}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(merchants.id, merchantId),
            sql`${merchants.pointsUsedMonth} + ${absAmount} <= ${monthlyPointCap}`,
          ),
        )
      if (capUpd.rowsAffected === 0) {
        throw jsonError(403, 'Monthly point cap reached', 'POINT_CAP_REACHED')
      }
    }

    const balUpd = await db
      .update(customerCards)
      .set({
        fidelityPoints: sql`${customerCards.fidelityPoints} + ${amount}`,
        lifetimePoints: sql`${customerCards.lifetimePoints} + ${amount > 0 ? amount : 0}`,
        lastVisitAt: now,
        updatedAt: now,
      })
      .where(
        isRemove
          ? and(eq(customerCards.id, card.id), sql`${customerCards.fidelityPoints} >= ${absAmount}`)
          : eq(customerCards.id, card.id),
      )
    if (balUpd.rowsAffected === 0) {
      throw jsonError(400, 'Insufficient fidelity points', 'INSUFFICIENT_POINTS')
    }

    return {
      customerId,
      merchantId,
      fidelityPoints: card.fidelityPoints + amount,
      mealVoucherBalance: card.mealVoucherBalance,
      lifetimePoints: card.lifetimePoints + (amount > 0 ? amount : 0),
      mealVoucherTotal: card.mealVoucherTotal,
      transactionId: await recordTransaction(merchantId, merchantName, customerId, cashierId, balanceType, isRemove, absAmount, rewardId, now),
    }
  }

  const balUpd = await db
    .update(customerCards)
    .set({
      mealVoucherBalance: sql`${customerCards.mealVoucherBalance} + ${amount}`,
      mealVoucherTotal: sql`${customerCards.mealVoucherTotal} + ${amount > 0 ? amount : 0}`,
      lastVisitAt: now,
      updatedAt: now,
    })
    .where(
      isRemove
        ? and(eq(customerCards.id, card.id), sql`${customerCards.mealVoucherBalance} >= ${absAmount}`)
        : eq(customerCards.id, card.id),
    )
  if (balUpd.rowsAffected === 0) {
    throw jsonError(400, 'Insufficient meal voucher balance', 'INSUFFICIENT_MEAL_VOUCHER')
  }

  return {
    customerId,
    merchantId,
    fidelityPoints: card.fidelityPoints,
    mealVoucherBalance: card.mealVoucherBalance + amount,
    lifetimePoints: card.lifetimePoints,
    mealVoucherTotal: card.mealVoucherTotal + (amount > 0 ? amount : 0),
    transactionId: await recordTransaction(merchantId, merchantName, customerId, cashierId, balanceType, isRemove, absAmount, rewardId, now),
  }
}

async function recordTransaction(
  merchantId: string,
  merchantName: string,
  customerId: string,
  cashierId: string,
  balanceType: 'fidelity' | 'meal_voucher',
  isRemove: boolean,
  absAmount: number,
  rewardId: string | null | undefined,
  now: Date,
): Promise<string> {
  const txType = isRemove
    ? (balanceType === 'fidelity' ? 'REMOVE_POINTS' : 'REMOVE_MEAL_VOUCHER')
    : (balanceType === 'fidelity' ? 'ADD_POINTS' : 'ADD_MEAL_VOUCHER')

  const id = crypto.randomUUID()
  await db.insert(stampTransactions).values({
    id,
    merchantId,
    customerId,
    cashierId,
    type: txType,
    balanceType,
    rewardId: rewardId ?? null,
    amount: absAmount,
    createdAt: now,
  })

  await db
    .insert(merchantSubscriptions)
    .values({ id: crypto.randomUUID(), userId: customerId, merchantId, createdAt: now })
    .onConflictDoNothing()

  const notificationType = rewardId
    ? 'reward_redeemed'
    : txType === 'ADD_POINTS'
      ? 'points_earned'
      : txType === 'ADD_MEAL_VOUCHER'
        ? 'meal_earned'
        : txType === 'REMOVE_POINTS'
          ? 'points_spent'
          : 'meal_spent'
  const data = rewardId ? { rewardId } : { amount: absAmount }

  const [pref] = await db
    .select({ enabled: user.notificationsEnabled })
    .from(user)
    .where(eq(user.id, customerId))
  const enabled = pref ? pref.enabled : true

  if (enabled) {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: customerId,
      merchantId,
      type: notificationType,
      data: JSON.stringify(data),
      isRead: false,
      createdAt: now,
    })

    const body =
      notificationType === 'reward_redeemed'
        ? `Récompense débloquée chez ${merchantName}`
        : notificationType === 'points_earned'
          ? `+${absAmount} points chez ${merchantName}`
          : notificationType === 'meal_earned'
            ? `+${absAmount} ticket repas chez ${merchantName}`
            : notificationType === 'points_spent'
              ? `${absAmount} points utilisés chez ${merchantName}`
              : `${absAmount} ticket repas utilisés chez ${merchantName}`

    await sendPush(customerId, {
      title: 'Fidelito',
      body,
      tag: `fidelito:${notificationType}`,
    })
  }

  return id
}
