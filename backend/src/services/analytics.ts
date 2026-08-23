import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '../db'
import {
  merchants,
  customerCards,
  stampTransactions,
  rewards,
  user,
  merchantPublic,
} from '../db/schema'

export interface DashboardStats {
  // Lifetime totals
  totalPointsAdded: number
  totalMealVoucherAdded: number
  pointsRedeemed: number
  mealVoucherRedeemed: number
  redemptionsCount: number
  uniqueCustomers: number
  newCustomersThisWeek: number

  // Admin-funded point balance
  pointsBalance: number
  pointsFunded: number
  pointsGiven: number

  // Activity counters (rolling windows, except transactionsToday which is calendar-day)
  transactionsToday: number
  transactionsThisWeek: number
  transactionsPrevWeek: number
  transactionsThisMonth: number

  // Time series for the requested window, split by earn vs redeem
  dailyActivity: Array<{ date: string; earned: number; redeemed: number }>

  // When customers actually show up
  hourlyDistribution: Array<{ hour: number; count: number }>
  weekdayDistribution: Array<{ day: number; count: number }>

  topCustomers: Array<{
    customerId: string
    firstName: string | null
    lastName: string | null
    fidelityPoints: number
    mealVoucherBalance: number
    lifetimePoints: number
  }>
  topRewards: Array<{ rewardId: string; title: string; redemptions: number }>

  recentTransactions: Array<{
    id: string
    type: string
    balanceType: string
    amount: number
    createdAt: Date
    customerName: string
    rewardTitle: string | null
  }>
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function getMerchantDashboard(merchantId: string, days = 14): Promise<DashboardStats> {
  const windowDays = Math.min(Math.max(days, 7), 90)

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startOfDayMs = startOfDay.getTime()
  const startOfMonthMs = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1).getTime()

  const nowMs = Date.now()
  const last7dMs = nowMs - 7 * DAY_MS
  const prev7dStartMs = nowMs - 14 * DAY_MS
  const seriesStartMs = nowMs - windowDays * DAY_MS

  const notStaff = sql`${customerCards.customerId} NOT IN (SELECT user_id FROM merchant_staff WHERE merchant_id = ${merchantId})`

  const [
    merchantRows,
    totalPointsResult,
    totalMealResult,
    pointsRedeemedResult,
    mealRedeemedResult,
    redemptionsCountResult,
    uniqueCustomersResult,
    newCustomersResult,
    txTodayResult,
    txWeekResult,
    txPrevWeekResult,
    txMonthResult,
    dailyActivityResult,
    hourlyResult,
    weekdayResult,
    topCustomers,
    topRewardsResult,
    recentTxs,
  ] = await Promise.all([
    db.select(merchantPublic).from(merchants).where(eq(merchants.id, merchantId)).limit(1),
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
      .select({ sum: sql<number>`coalesce(sum(${stampTransactions.amount}), 0)` })
      .from(stampTransactions)
      .where(
        and(
          eq(stampTransactions.merchantId, merchantId),
          eq(stampTransactions.balanceType, 'fidelity'),
          eq(stampTransactions.type, 'REMOVE_POINTS'),
        ),
      ),
    db
      .select({ sum: sql<number>`coalesce(sum(${stampTransactions.amount}), 0)` })
      .from(stampTransactions)
      .where(
        and(
          eq(stampTransactions.merchantId, merchantId),
          eq(stampTransactions.balanceType, 'meal_voucher'),
          eq(stampTransactions.type, 'REMOVE_MEAL_VOUCHER'),
        ),
      ),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.rewardId} is not null`)),
    db
      .select({ count: sql<number>`count(distinct ${customerCards.customerId})` })
      .from(customerCards)
      .where(and(eq(customerCards.merchantId, merchantId), notStaff)),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(customerCards)
      .where(and(eq(customerCards.merchantId, merchantId), notStaff, sql`${customerCards.createdAt} >= ${last7dMs}`)),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${startOfDayMs}`)),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${last7dMs}`)),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(
        and(
          eq(stampTransactions.merchantId, merchantId),
          sql`${stampTransactions.createdAt} >= ${prev7dStartMs}`,
          sql`${stampTransactions.createdAt} < ${last7dMs}`,
        ),
      ),
    db
      .select({ count: sql<number>`coalesce(count(*), 0)` })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${startOfMonthMs}`)),
    db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', ${stampTransactions.createdAt} / 1000, 'unixepoch')`,
        earned: sql<number>`coalesce(sum(case when ${stampTransactions.type} in ('ADD_POINTS','ADD_MEAL_VOUCHER') then 1 else 0 end), 0)`,
        redeemed: sql<number>`coalesce(sum(case when ${stampTransactions.type} in ('REMOVE_POINTS','REMOVE_MEAL_VOUCHER') then 1 else 0 end), 0)`,
      })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${seriesStartMs}`))
      .groupBy(sql`strftime('%Y-%m-%d', ${stampTransactions.createdAt} / 1000, 'unixepoch')`),
    db
      .select({
        hour: sql<number>`cast(strftime('%H', ${stampTransactions.createdAt} / 1000, 'unixepoch') as integer)`,
        count: sql<number>`count(*)`,
      })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${seriesStartMs}`))
      .groupBy(sql`strftime('%H', ${stampTransactions.createdAt} / 1000, 'unixepoch')`),
    db
      .select({
        day: sql<number>`cast(strftime('%w', ${stampTransactions.createdAt} / 1000, 'unixepoch') as integer)`,
        count: sql<number>`count(*)`,
      })
      .from(stampTransactions)
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.createdAt} >= ${seriesStartMs}`))
      .groupBy(sql`strftime('%w', ${stampTransactions.createdAt} / 1000, 'unixepoch')`),
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
      .where(and(eq(customerCards.merchantId, merchantId), notStaff))
      .orderBy(desc(customerCards.lifetimePoints))
      .limit(10),
    db
      .select({
        rewardId: rewards.id,
        title: rewards.title,
        redemptions: sql<number>`count(*)`,
      })
      .from(stampTransactions)
      .innerJoin(rewards, eq(stampTransactions.rewardId, rewards.id))
      .where(and(eq(stampTransactions.merchantId, merchantId), sql`${stampTransactions.rewardId} is not null`))
      .groupBy(rewards.id)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
    db
      .select({
        id: stampTransactions.id,
        type: stampTransactions.type,
        balanceType: stampTransactions.balanceType,
        amount: stampTransactions.amount,
        createdAt: stampTransactions.createdAt,
        customerFirstName: user.firstName,
        customerLastName: user.lastName,
        rewardTitle: rewards.title,
      })
      .from(stampTransactions)
      .innerJoin(user, eq(stampTransactions.customerId, user.id))
      .leftJoin(rewards, eq(stampTransactions.rewardId, rewards.id))
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
    rewardTitle: tx.rewardTitle ?? null,
  }))

  // Fill in every day of the window (even zero-activity days) so the chart doesn't have gaps.
  const activityByDate = new Map(dailyActivityResult.map((r) => [r.date, r]))
  const dailyActivity: DashboardStats['dailyActivity'] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(startOfDayMs - i * DAY_MS)
    const key = d.toISOString().slice(0, 10)
    const row = activityByDate.get(key)
    dailyActivity.push({ date: key, earned: row ? Number(row.earned) : 0, redeemed: row ? Number(row.redeemed) : 0 })
  }

  const hourlyByHour = new Map(hourlyResult.map((r) => [Number(r.hour), Number(r.count)]))
  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({ hour, count: hourlyByHour.get(hour) ?? 0 }))

  const weekdayByDay = new Map(weekdayResult.map((r) => [Number(r.day), Number(r.count)]))
  const weekdayDistribution = Array.from({ length: 7 }, (_, day) => ({ day, count: weekdayByDay.get(day) ?? 0 }))

  return {
    totalPointsAdded: totalPointsResult[0]?.sum ?? 0,
    totalMealVoucherAdded: totalMealResult[0]?.sum ?? 0,
    pointsRedeemed: pointsRedeemedResult[0]?.sum ?? 0,
    mealVoucherRedeemed: mealRedeemedResult[0]?.sum ?? 0,
    redemptionsCount: redemptionsCountResult[0]?.count ?? 0,
    uniqueCustomers: uniqueCustomersResult[0]?.count ?? 0,
    newCustomersThisWeek: newCustomersResult[0]?.count ?? 0,
    pointsBalance: merchant?.pointsBalance ?? 0,
    pointsFunded: merchant?.pointsFunded ?? 0,
    pointsGiven: (merchant?.pointsFunded ?? 0) - (merchant?.pointsBalance ?? 0),
    transactionsToday: txTodayResult[0]?.count ?? 0,
    transactionsThisWeek: txWeekResult[0]?.count ?? 0,
    transactionsPrevWeek: txPrevWeekResult[0]?.count ?? 0,
    transactionsThisMonth: txMonthResult[0]?.count ?? 0,
    dailyActivity,
    hourlyDistribution,
    weekdayDistribution,
    topCustomers: topCustomers.map((c) => ({
      customerId: c.customerId,
      firstName: c.firstName,
      lastName: c.lastName,
      fidelityPoints: c.fidelityPoints,
      mealVoucherBalance: c.mealVoucherBalance,
      lifetimePoints: c.lifetimePoints,
    })),
    topRewards: topRewardsResult.map((r) => ({
      rewardId: r.rewardId,
      title: r.title,
      redemptions: Number(r.redemptions),
    })),
    recentTransactions,
  }
}

export async function getMerchantCustomers(merchantId: string, limit = 100, cursor?: number) {
  const notStaff = sql`${customerCards.customerId} NOT IN (SELECT user_id FROM merchant_staff WHERE merchant_id = ${merchantId})`
  const conditions = [eq(customerCards.merchantId, merchantId), notStaff]
  if (cursor !== undefined) conditions.push(sql`${customerCards.lastVisitAt} < ${cursor}`)
  return db
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
