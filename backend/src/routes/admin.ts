import { Hono } from 'hono'
import { eq, desc, gte, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { user, rateLimitLog, authUsers } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import type { AppVariables } from '../types/app'

export const adminRoutes = new Hono<{ Variables: AppVariables }>()

adminRoutes.use('*', requireAuth(), requireRole('admin'))

adminRoutes.get('/stats', async (c) => {
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()

  const [[{ users }], [{ admins }], [{ newUsers24h }], [{ rateLimited24h }]] =
    await Promise.all([
      db.select({ users: sql<number>`count(*)` }).from(user),
      db.select({ admins: sql<number>`count(*)` }).from(user).where(eq(user.role, 'admin')),
      db.select({ newUsers24h: sql<number>`count(*)` }).from(user).where(gte(user.createdAt, dayAgo)),
      db.select({ rateLimited24h: sql<number>`count(*)` }).from(rateLimitLog).where(gte(rateLimitLog.triggeredAt, dayAgo)),
    ])

  return c.json({ users, admins, newUsers24h, rateLimited24h })
})

adminRoutes.get('/users', async (c) => {
  const rows = await db
    .select({
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      locale: user.locale,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(500)
  return c.json({ users: rows })
})

adminRoutes.get('/users/:id', async (c) => {
  const [row] = await db.select().from(user).where(eq(user.id, c.req.param('id'))).limit(1)
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ user: row })
})

const userPatchSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().nullable().optional(),
  locale: z.enum(['en', 'fr', 'ar']).optional(),
})

adminRoutes.patch('/users/:id', zValidator('json', userPatchSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  await db
    .update(user)
    .set({ ...body, lastUpdated: new Date().toISOString() })
    .where(eq(user.id, id))
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  return c.json({ user: row })
})

adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(authUsers).where(eq(authUsers.id, id))
  return c.json({ ok: true })
})

adminRoutes.get('/rate-limits', async (c) => {
  const rows = await db
    .select()
    .from(rateLimitLog)
    .orderBy(desc(rateLimitLog.triggeredAt))
    .limit(100)
  return c.json({ items: rows })
})