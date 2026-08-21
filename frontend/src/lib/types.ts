export type Locale = 'en' | 'fr' | 'ar'

export interface UserProfile {
  id: string
  role: string
  firstName?: string
  lastName?: string
  email: string
  address?: string | null
  locale?: string | null
  createdAt?: string
  lastUpdated?: string
}

export interface AdminStats {
  users: number
  admins: number
  newUsers24h: number
  rateLimited24h: number
}

export interface AdminUser {
  id: string
  role: 'user' | 'admin'
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