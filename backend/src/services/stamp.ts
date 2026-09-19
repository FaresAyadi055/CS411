import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  merchants,
  merchantStaff,
  customerCards,
  stampTransactions,
  usedQrSignatures,
  authUsers,
} from '../db/schema'
import { parseQrPayload, verifyTotp, getSignature } from './totp'
import { jsonError } from '../lib/errors'

export interface VerifyResult {
  customerId: string
  customerName: string
  merchantId: string
  fidelityPoints: number
  lifetimePoints: number
}

export interface AdjustResult {
  customerId: string
  merchantId: string
  fidelityPoints: number
  lifetimePoints: number
  transactionId: string
  lowBalance?: boolean
}

async function resolveCashierMerchant(cashierId: string) {
  const [row] = await db
    .select({
      merchantId: merchantStaff.merchantId,
      merchantName: merchants.name,
      isActive: merchants.isActive,
      pointsBalance: merchants.pointsBalance,
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
    pointsBalance: row.pointsBalance,
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
      lifetimePoints: 0,
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
    lifetimePoints: card.lifetimePoints,
  }
}

export async function verifyQrByCustomerId(
  customerId: string,
  totpCode: string,
  cashierId: string,
): Promise<VerifyResult> {
  const [customer] = await db
    .select({ id: authUsers.id, name: authUsers.name, totpSecret: authUsers.totpSecret })
    .from(authUsers)
    .where(eq(authUsers.id, customerId))
    .limit(1)
  if (!customer) {
    throw jsonError(400, 'Customer not found', 'CUSTOMER_NOT_FOUND')
  }

  if (totpCode) {
    if (!customer.totpSecret) {
      throw jsonError(400, 'Customer has no TOTP secret', 'NO_TOTP_SECRET')
    }
    const valid = await verifyTotp(customer.totpSecret, totpCode)
    if (!valid) {
      throw jsonError(400, 'Invalid or expired TOTP code', 'INVALID_TOTP')
    }
  }

  const { merchantId } = await resolveCashierMerchant(cashierId)

  const card = await getOrCreateCard(customerId, merchantId)

  return {
    customerId,
    customerName: customer.name,
    merchantId,
    fidelityPoints: card.fidelityPoints,
    lifetimePoints: card.lifetimePoints,
  }
}

export async function adjustBalance(
  cashierId: string,
  customerId: string,
  amount: number,
  rewardId?: string | null,
): Promise<AdjustResult> {
  const { merchantId, merchantName, pointsBalance } = await resolveCashierMerchant(cashierId)

  if (amount === 0) {
    throw jsonError(400, 'Amount cannot be zero', 'INVALID_AMOUNT')
  }

  const isRemove = amount < 0
  const absAmount = Math.abs(amount)

  const card = await getOrCreateCard(customerId, merchantId)

  const now = new Date()
  const startingBalance = pointsBalance ?? 0
  const newBalance = Math.max(0, startingBalance - (!isRemove ? absAmount : 0))
  const lowBalance = newBalance <= 0

  return await db.transaction(async (tx) => {
    if (!isRemove) {
      await tx
        .update(merchants)
        .set({
          pointsBalance: newBalance,
          updatedAt: now,
        })
        .where(eq(merchants.id, merchantId))
    }

    const balUpd = await tx
      .update(customerCards)
      .set({
        fidelityPoints: sql`${customerCards.fidelityPoints} + ${amount}`,
        lifetimePoints: sql`${customerCards.lifetimePoints} + ${amount > 0 ? amount : 0}`,
        lastVisitAt: now,
        updatedAt: now,
      })
      .where(
        isRemove
          ? and(
              eq(customerCards.id, card.id),
              sql`${customerCards.fidelityPoints} >= ${absAmount}`,
            )
          : eq(customerCards.id, card.id),
      )
    if (balUpd.rowsAffected === 0) {
      throw jsonError(400, 'Insufficient fidelity points', 'INSUFFICIENT_POINTS')
    }

    const txType = isRemove ? 'REMOVE_POINTS' : 'ADD_POINTS'
    const transactionId = crypto.randomUUID()
    await tx.insert(stampTransactions).values({
      id: transactionId,
      merchantId,
      customerId,
      cashierId,
      type: txType,
      balanceType: 'fidelity',
      rewardId: rewardId ?? null,
      amount: absAmount,
      createdAt: now,
    })

    return {
      customerId,
      merchantId,
      fidelityPoints: card.fidelityPoints + amount,
      lifetimePoints: card.lifetimePoints + (amount > 0 ? amount : 0),
      transactionId,
      lowBalance,
    }
  })
}

export async function adminAdjustBalance(
  actorId: string,
  merchantId: string,
  customerId: string,
  amount: number,
): Promise<AdjustResult> {
  const [merchant] = await db
    .select({ id: merchants.id, name: merchants.name, pointsBalance: merchants.pointsBalance })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1)
  if (!merchant) throw jsonError(404, 'Merchant not found', 'MERCHANT_NOT_FOUND')

  if (amount === 0) throw jsonError(400, 'Amount cannot be zero', 'INVALID_AMOUNT')
  const isRemove = amount < 0
  const absAmount = Math.abs(amount)

  const card = await getOrCreateCard(customerId, merchantId)

  const now = new Date()
  const startingBalance = merchant.pointsBalance ?? 0
  const newBalance = Math.max(0, startingBalance - (!isRemove ? absAmount : 0))
  const lowBalance = newBalance <= 0
  return await db.transaction(async (tx) => {
    if (!isRemove) {
      await tx
        .update(merchants)
        .set({ pointsBalance: newBalance, updatedAt: now })
        .where(eq(merchants.id, merchantId))
    }

    const balUpd = await tx
      .update(customerCards)
      .set({
        fidelityPoints: sql`${customerCards.fidelityPoints} + ${amount}`,
        lifetimePoints: sql`${customerCards.lifetimePoints} + ${amount > 0 ? amount : 0}`,
        lastVisitAt: now,
        updatedAt: now,
      })
      .where(
        isRemove
          ? and(
              eq(customerCards.id, card.id),
              sql`${customerCards.fidelityPoints} >= ${absAmount}`,
            )
          : eq(customerCards.id, card.id),
      )
    if (balUpd.rowsAffected === 0) {
      throw jsonError(400, 'Insufficient fidelity points', 'INSUFFICIENT_POINTS')
    }

    const txType = isRemove ? 'REMOVE_POINTS' : 'ADD_POINTS'
    const transactionId = crypto.randomUUID()
    await tx.insert(stampTransactions).values({
      id: transactionId,
      merchantId,
      customerId,
      cashierId: actorId,
      type: txType,
      balanceType: 'fidelity',
      rewardId: null,
      amount: absAmount,
      createdAt: now,
    })

    return {
      customerId,
      merchantId,
      fidelityPoints: card.fidelityPoints + amount,
      lifetimePoints: card.lifetimePoints + (amount > 0 ? amount : 0),
      transactionId,
      lowBalance,
    }
  })
}
