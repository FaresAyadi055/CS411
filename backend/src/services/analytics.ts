import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '../db'
import {
  merchants,
  customerCards,
  stampTransactions,
  user,
} from '../db/schema'

export interface DashboardStats {
  totalPointsAdded: number
  totalMealVoucherAdded: number
  uniqueCustomers: number
  pointsUsedMonth: number
  monthlyPointCap: number
  transactionsToday: number
  transactionsThisWeek: number
  transactionsThisMonth: number
  dailyTransactions: Array<{ date: string; count: number }>
  topCustomers: Array<{
    customerId: string
    firstName: string | null
    lastName: string | null
    fidelityPoints: number
    mealVoucherBalance: number
    lifetimePoints: number
  }>
  recentTransactions: Array<{
    id: string
    type: string
    balanceType: string
    amount: number
    createdAt: Date
    customerName: string
  }>
}

export async function getMerchantDashboard(merchantId: string): Promise<DashboardStats> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startOfDayMs = startOfDay.getTime()
  const startOfWeek = new Date(startOfDay)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const startOfWeekMs = startOfWeek.getTime()
  const startOfMonthMs = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1).getTime()

  const [
    merchantRows,
    totalPointsResult,
    totalMealResult,
    uniqueCustomersResult,
    txTodayResult,
    txWeekResult,
    txMonthResult,
    dailyTransactionsResult,
    topCustomers,
    recentTxs,
  ] = await Promise.all([
    db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1),
    db
      .select({ sum: sql<number>`coalesce(sum(${stampTransactions.amount}), 0)` })
      .from(stampTransactions)
      .where(
        and(
          eq(stampTransactions.merchantId, merchantId),
          eq(stampTransactions.balanceType, 'fidelity'),
          eq(stampTransactions.type, 'ADD_POINTS'),
        ),
      ),
    db
      .select({ sum: sql<number>`coalesce(sum(${stampTransactions.amount}), 0)` })
      .from(stampTransactions)
      .where(
        and(
          eq(stampTransactions.merchantId, merchantId),
          eq(stampTransactions.balanceType, 'meal_voucher'),
          eq(stampTransactions.type, 'ADD_MEAL_VOUCHER'),
        ),
      ),
    db
      .select({ count: sql<number>`count(distinct ${customerCards.customerId})` })
      .from(customerCards)
      .where(eq(customerCards.merchantId, merchantId)),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${startOfDayMs}`)),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${startOfWeekMs}`)),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${startOfMonthMs}`)),
    db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', ${stampTransactions.createdAt} / 1000, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(stampTransactions)
      .where(
        and(
          eq(stampTransactions.merchantId, merchantId),
          sql`${stampTransactions.createdAt} >= ${Date.now() - 7 * 24 * 60 * 60 * 1000}`,
        ),
      )
      .groupBy(sql`strftime('%Y-%m-%d', ${stampTransactions.createdAt} / 1000, 'unixepoch')`),
    db
      .select({
        customerId: customerCards.customerId,
        firstName: user.firstName,
        lastName: user.lastName,
        fidelityPoints: customerCards.fidelityPoints,
        mealVoucherBalance: customerCards.mealVoucherBalance,
        lifetimePoints: customerCards.lifetimePoints,
      })
      .from(customerCards)
      .innerJoin(user, eq(customerCards.customerId, user.id))
      .where(eq(customerCards.merchantId, merchantId))
      .orderBy(desc(customerCards.lifetimePoints))
      .limit(10),
    db
      .select({
        id: stampTransactions.id,
        type: stampTransactions.type,
        balanceType: stampTransactions.balanceType,
        amount: stampTransactions.amount,
        createdAt: stampTransactions.createdAt,
        customerFirstName: user.firstName,
        customerLastName: user.lastName,
      })
      .from(stampTransactions)
      .innerJoin(user, eq(stampTransactions.customerId, user.id))
      .where(eq(stampTransactions.merchantId, merchantId))
      .orderBy(desc(stampTransactions.createdAt))
      .limit(20),
  ])

  const merchant = merchantRows[0]

  const recentTransactions = recentTxs.map((tx) => ({
    id: tx.id,
    type: tx.type,
    balanceType: tx.balanceType,
    amount: tx.amount,
    createdAt: tx.createdAt,
    customerName: `${tx.customerFirstName ?? ''} ${tx.customerLastName ?? ''}`.trim(),
  }))

  return {
    totalPointsAdded: totalPointsResult[0]?.sum ?? 0,
    totalMealVoucherAdded: totalMealResult[0]?.sum ?? 0,
    uniqueCustomers: uniqueCustomersResult[0]?.count ?? 0,
    pointsUsedMonth: merchant?.pointsUsedMonth ?? 0,
    monthlyPointCap: merchant?.monthlyPointCap ?? 300,
    transactionsToday: txTodayResult[0]?.count ?? 0,
    transactionsThisWeek: txWeekResult[0]?.count ?? 0,
    transactionsThisMonth: txMonthResult[0]?.count ?? 0,
    dailyTransactions: dailyTransactionsResult.map((r) => ({ date: r.date, count: r.count })),
    topCustomers: topCustomers.map((c) => ({
      customerId: c.customerId,
      firstName: c.firstName,
      lastName: c.lastName,
      fidelityPoints: c.fidelityPoints,
      mealVoucherBalance: c.mealVoucherBalance,
      lifetimePoints: c.lifetimePoints,
    })),
    recentTransactions,
  }
}

export async function getMerchantCustomers(merchantId: string, limit = 100, cursor?: number) {
  const conditions = [eq(customerCards.merchantId, merchantId)]
  if (cursor !== undefined) conditions.push(sql`${customerCards.lastVisitAt} < ${cursor}`)
  return db
    .select({
      customerId: customerCards.customerId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      fidelityPoints: customerCards.fidelityPoints,
      mealVoucherBalance: customerCards.mealVoucherBalance,
      lifetimePoints: customerCards.lifetimePoints,
      lastVisitAt: customerCards.lastVisitAt,
    })
    .from(customerCards)
    .innerJoin(user, eq(customerCards.customerId, user.id))
    .where(and(...conditions))
    .orderBy(desc(customerCards.lastVisitAt))
    .limit(limit)
}

export async function getMerchantTransactions(merchantId: string, limit = 50, cursor?: number) {
  const conditions = [eq(stampTransactions.merchantId, merchantId)]
  if (cursor !== undefined) conditions.push(sql`${stampTransactions.createdAt} < ${cursor}`)
  return db
    .select({
      id: stampTransactions.id,
      type: stampTransactions.type,
      balanceType: stampTransactions.balanceType,
      amount: stampTransactions.amount,
      createdAt: stampTransactions.createdAt,
      customerFirstName: user.firstName,
      customerLastName: user.lastName,
      customerEmail: user.email,
    })
    .from(stampTransactions)
    .innerJoin(user, eq(stampTransactions.customerId, user.id))
    .where(and(...conditions))
    .orderBy(desc(stampTransactions.createdAt))
    .limit(limit)
}

export async function getCashierStamps(cashierId: string, merchantId: string) {
  return db
    .select({
      id: stampTransactions.id,
      type: stampTransactions.type,
      balanceType: stampTransactions.balanceType,
      amount: stampTransactions.amount,
      createdAt: stampTransactions.createdAt,
      customerFirstName: user.firstName,
      customerLastName: user.lastName,
    })
    .from(stampTransactions)
    .innerJoin(user, eq(stampTransactions.customerId, user.id))
    .where(
      and(
        eq(stampTransactions.cashierId, cashierId),
        eq(stampTransactions.merchantId, merchantId),
      ),
    )
    .orderBy(desc(stampTransactions.createdAt))
    .limit(50)
}
