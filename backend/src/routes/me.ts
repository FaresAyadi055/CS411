import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { user } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppVariables } from '../types/app'

export const meRoutes = new Hono<{ Variables: AppVariables }>()

meRoutes.use('*', requireAuth())

meRoutes.get('/', async (c) => {
  const userId = c.get('userId')!
  const [profile] = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  if (!profile) return c.json({ error: 'Profile not found' }, 404)
  return c.json({ profile })
})

const patchProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().nullable().optional(),
  locale: z.enum(['en', 'fr', 'ar']).optional(),
  notificationsEnabled: z.boolean().optional(),
})

meRoutes.patch('/', zValidator('json', patchProfileSchema), async (c) => {
  const userId = c.get('userId')!
  const body = c.req.valid('json')

  await db
    .update(user)
    .set({
      ...body,
      lastUpdated: new Date().toISOString(),
    })
    .where(eq(user.id, userId))

  const [profile] = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  return c.json({ profile })
})