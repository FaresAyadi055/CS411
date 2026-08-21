import type { Auth } from '../auth'

export type AppVariables = {
  userId: string | null
  role: string | null
  session: Auth['$Infer']['Session']['session'] | null
  authUser: Auth['$Infer']['Session']['user'] | null
  rateLimited: boolean
}

export type UserRole = 'admin' | 'user'
