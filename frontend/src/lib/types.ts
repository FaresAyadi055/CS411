export type Locale = 'en' | 'fr' | 'ar'

export interface UserProfile {
  id: string
  role: 'client' | 'cashier' | 'business' | 'admin'
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email: string
  address?: string | null
  locale?: string | null
  notificationsEnabled?: boolean
  createdAt?: string
  lastUpdated?: string
}

export type NotificationType =
  | 'points_earned'
  | 'meal_earned'
  | 'points_spent'
  | 'meal_spent'
  | 'reward_redeemed'

export interface AppNotification {
  id: string
  type: NotificationType
  data: { amount?: number; rewardId?: string }
  isRead: boolean
  createdAt: number
  merchantName: string | null
  merchantLogo: string | null
}

export interface Merchant {
  id: string
  ownerId: string
  name: string
  slug: string
  logoUrl?: string | null
  stampsPerReward: number
  planTier: 'starter' | 'growth' | 'pro'
  monthlyPointCap: number
  pointsUsedMonth: number
  isActive: boolean
  address?: string | null
  lat?: number | null
  lng?: number | null
  createdAt: number
  updatedAt: number
}

export interface CustomerCard {
  id: string
  customerId: string
  merchantId: string
  merchantName?: string
  merchantLogo?: string | null
  fidelityPoints: number
  mealVoucherBalance: number
  lifetimePoints: number
  mealVoucherTotal: number
  lastVisitAt?: number | null
  createdAt: number
  updatedAt: number
}

export interface Reward {
  id: string
  merchantId: string
  merchantName?: string
  title: string
  description?: string | null
  stampsCost: number
  imageUrl?: string | null
  isAvailable: boolean
  canRedeem?: boolean
  createdAt: number
}

export interface StampTransaction {
  id: string
  merchantId: string
  customerId: string
  cashierId?: string
  type: 'EARN_STAMP' | 'REDEEM_REWARD'
  stampsCount: number
  rewardId?: string | null
  createdAt: number
  customerFirstName?: string
  customerLastName?: string
  customerName?: string
  cashierName?: string
}

export interface DashboardStats {
  totalPointsAdded: number
  totalMealVoucherAdded: number
  pointsRedeemed: number
  mealVoucherRedeemed: number
  redemptionsCount: number
  uniqueCustomers: number
  newCustomersThisWeek: number
  pointsUsedMonth: number
  monthlyPointCap: number
  transactionsToday: number
  transactionsThisWeek: number
  transactionsPrevWeek: number
  transactionsThisMonth: number
  dailyActivity: Array<{ date: string; earned: number; redeemed: number }>
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
    balanceType: 'fidelity' | 'meal_voucher'
    amount: number
    createdAt: number
    customerName: string
    rewardTitle: string | null
  }>
}


export interface StaffMember {
  id: string
  userId: string
  role: 'owner' | 'cashier'
  createdAt: number
  firstName?: string | null
  lastName?: string | null
  email: string
  pointsAwarded?: number
  mealAwarded?: number
  transactionCount?: number
}

export interface AdminStats {
  users: number
  admins: number
  newUsers24h: number
  rateLimited24h: number
}

export interface AdminUser {
  id: string
  role: 'client' | 'cashier' | 'business' | 'admin'
  firstName?: string | null
  lastName?: string | null
  email: string
  locale?: string | null
  createdAt?: string
}

export interface RateLimitItem {
  id: string
  ipAddress: string
  reason: string
  triggeredAt: string
  isResolved: number
}

export interface ApiError {
  error: string
  code?: string
}

export interface StoreCard {
  id: string
  merchantId: string
  merchantName: string | null
  merchantLogo: string | null
  merchantAddress: string | null
  merchantLat: number | null
  merchantLng: number | null
  fidelityPoints: number
  mealVoucherBalance: number
  lifetimePoints: number
  mealVoucherTotal: number
  lastVisitAt: number | null
}
