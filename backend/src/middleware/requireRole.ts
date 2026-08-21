import { createMiddleware } from 'hono/factory'
import type { AppVariables, UserRole } from '../types/app'

export function requireRole(...roles: UserRole[]) {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const role = c.get('role')
    if (!role || !roles.includes(role as UserRole)) {
      return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
    }
    await next()
  })
}
