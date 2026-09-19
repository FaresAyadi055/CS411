export type Locale = 'en' | 'fr' | 'ar'

export interface UserProfile {
  id: string
  role: 'client' | 'business' | 'admin'
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email: string
  address?: string | null
  locale?: string | null
  createdAt?: string
  lastUpdated?: string
}


// (NotificationType, AppNotification removed for demo)
// (StaffMember removed for demo)

export interface Merchant {
  id: string
  ownerId: string
  name: string
  slug: string
  logoUrl?: string | null
  stampsPerReward: number
  planTier: 'starter' | 'growth' | 'pro'
  pointsBalance: number
  pointsFunded: number
  isActive: boolean
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
  lifetimePoints: number
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
  pointsRedeemed: number
  redemptionsCount: number
  uniqueCustomers: number
  newCustomersThisWeek: number
  pointsBalance: number
  pointsFunded: number
  pointsGiven: number
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
    lifetimePoints: number
  }>
  topRewards: Array<{ rewardId: string; title: string; redemptions: number }>
  recentTransactions: Array<{
    id: string
    type: string
    amount: number
    createdAt: number
    customerName: string
    rewardTitle: string | null
  }>
}



// (StaffMember removed for demo)

export interface AdminStats {
  users: number
  admins: number
  newUsers24h: number
  rateLimited24h: number
}

export interface AdminUser {
  id: string
  role: 'client' | 'business' | 'admin'
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
  fidelityPoints: number
  lifetimePoints: number
  lastVisitAt: number | null
}
