import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { notifications, merchants, pushSubscriptions } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppVariables } from '../types/app'

export const notificationRoutes = new Hono<{ Variables: AppVariables }>()

notificationRoutes.use('*', requireAuth())

notificationRoutes.get('/notifications', async (c) => {
  const userId = c.get('userId')!
  const limit = Math.min(parseInt(c.req.query('limit') ?? '30'), 100)
  const cursor = c.req.query('cursor') ? parseInt(c.req.query('cursor')!) : undefined

  const conditions = [eq(notifications.userId, userId)]
  if (cursor !== undefined) conditions.push(sql`${notifications.createdAt} < ${cursor}`)

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      data: notifications.data,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      merchantName: merchants.name,
      merchantLogo: merchants.logoUrl,
    })
    .from(notifications)
    .leftJoin(merchants, eq(notifications.merchantId, merchants.id))
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)

  const [{ count }] = await db
    .select({ count: sql<number>`coalesce(count(*), 0)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

  const items = rows.map((r) => ({
    id: r.id,
    type: r.type,
    data: r.data ? JSON.parse(r.data) : {},
    isRead: r.isRead,
    createdAt: r.createdAt,
    merchantName: r.merchantName,
    merchantLogo: r.merchantLogo,
  }))

  const nextCursor = rows.length === limit ? rows[rows.length - 1].createdAt : null

  return c.json({ notifications: items, unreadCount: count, nextCursor })
})

notificationRoutes.get('/notifications/unread', async (c) => {
  const userId = c.get('userId')!
  const [{ count }] = await db
    .select({ count: sql<number>`coalesce(count(*), 0)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
  return c.json({ count })
})

notificationRoutes.post('/notifications/:id/read', async (c) => {
  const userId = c.get('userId')!
  const id = c.req.param('id')
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
  return c.json({ success: true })
})

notificationRoutes.post('/notifications/read-all', async (c) => {
  const userId = c.get('userId')!
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId))
  return c.json({ success: true })
})

const pushSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})

notificationRoutes.post('/push/subscribe', zValidator('json', pushSchema), async (c) => {
  const userId = c.get('userId')!
  const { endpoint, p256dh, auth } = c.req.valid('json')
  const now = new Date()
  await db
    .insert(pushSubscriptions)
    .values({ id: crypto.randomUUID(), userId, endpoint, p256dh, auth, createdAt: now })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh, auth } })
  return c.json({ success: true })
})
