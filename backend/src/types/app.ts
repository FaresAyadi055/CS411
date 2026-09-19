export type AppVariables = {
  userId: string | null
  role: string | null
  session: { userId: string; role: string } | null
  authUser: { id: string; name: string; email: string } | null
  rateLimited: boolean
}

export type UserRole = 'client' | 'business' | 'admin'
