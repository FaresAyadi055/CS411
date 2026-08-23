import { Hono } from 'hono'
import { eq, or, desc } from 'drizzle-orm'
import { db } from '../db'
import { merchants } from '../db/schema'
import type { AppVariables } from '../types/app'

export const publicRoutes = new Hono<{ Variables: AppVariables }>()

publicRoutes.get('/merchants', async (c) => {
  const rows = await db
    .select({
      id: merchants.id,
      name: merchants.name,
      logoUrl: merchants.logoUrl,
      slug: merchants.slug,
    })
    .from(merchants)
    .where(eq(merchants.isActive, true))
    .orderBy(desc(merchants.createdAt))
    .limit(24)

  return c.json({ merchants: rows })
})

publicRoutes.get('/merchant/:ref', async (c) => {
  const ref = c.req.param('ref')
  if (!ref) return c.json({ error: 'Missing referral reference' }, 400)

  const [m] = await db
    .select({
      id: merchants.id,
      name: merchants.name,
      logoUrl: merchants.logoUrl,
      slug: merchants.slug,
    })
    .from(merchants)
    .where(or(eq(merchants.id, ref), eq(merchants.slug, ref)))
    .limit(1)

  if (!m) return c.json({ error: 'Merchant not found' }, 404)
  return c.json({ merchant: m })
})
