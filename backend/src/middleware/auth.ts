import { createMiddleware } from 'hono/factory'
import { eq } from 'drizzle-orm'
import { getAuth } from '../auth'
import { db } from '../db'
import { user } from '../db/schema'
import { env } from '../config/env'
import type { AppVariables } from '../types/app'

export const sessionMiddleware = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    if (env.disableAuth) {
      c.set('userId', 'dev-user-id')
      c.set('role', 'admin')
      c.set('session', { id: 'dev-session' } as never)
      c.set('authUser', { id: 'dev-user-id', name: 'Dev User', email: 'dev@example.com' } as never)
      await next()
      return
    }

    const session = await getAuth().api.getSession({ headers: c.req.raw.headers })

    if (!session) {
      c.set('userId', null)
      c.set('role', null)
      c.set('session', null)
      c.set('authUser', null)
      await next()
      return
    }

    c.set('authUser', session.user)
    c.set('session', session.session)
    c.set('userId', session.user.id)

    const [profile] = await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id)).limit(1)
    c.set('role', profile?.role ?? 'user')

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
