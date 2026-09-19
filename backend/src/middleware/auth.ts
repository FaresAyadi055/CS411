import { createMiddleware } from 'hono/factory'
import { db } from '../db'
import { user, authUsers } from '../db/schema'
import { eq } from 'drizzle-orm'
import { env } from '../config/env'
import { verifyJwt } from '../jwt'
import { extractTokenFromCookie } from '../lib/cookie'
import type { AppVariables } from '../types/app'

export const sessionMiddleware = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    if (env.disableAuth) {
      c.set('userId', 'demo-user-id')
      c.set('role', 'business')
      c.set('session', null)
      c.set('authUser', { id: 'demo-user-id', name: 'Demo User', email: 'demo@example.com' } as never)
      await next()
      return
    }

    const token = extractTokenFromCookie(c.req.header('Cookie'))

    if (token) {
      const payload = await verifyJwt(token)
      if (payload) {
        const [authUser] = await db.select().from(authUsers).where(eq(authUsers.id, payload.sub)).limit(1)
        if (authUser) {
          const [profile] = await db.select().from(user).where(eq(user.id, authUser.id)).limit(1)
          c.set('userId', authUser.id)
          c.set('role', profile?.role || payload.role)
          c.set('session', { userId: authUser.id, role: profile?.role || payload.role } as never)
          c.set('authUser', authUser as never)
          await next()
          return
        }
      }
    }

    c.set('userId', null)
    c.set('role', null)
    c.set('session', null)
    c.set('authUser', null)
    await next()
  },
)

export function requireAuth() {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    if (env.disableAuth) {
      await next()
      return
    }
    if (!c.get('userId')) {
      return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }
    await next()
  })
}
