import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { authUsers, user, account } from '../db/schema'
import { hashPassword, verifyPassword } from '../lib/auth-password'
import { ulid } from '../lib/ulid'
import { signJwt, verifyJwt } from '../jwt'
import { env } from '../config/env'
import { setTokenCookie, clearTokenCookie, extractTokenFromCookie } from '../lib/cookie'
import type { AppVariables } from '../types/app'

export const authRoutes = new Hono<{ Variables: AppVariables }>()

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
})

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

authRoutes.post('/sign-up/email', zValidator('json', signUpSchema), async (c) => {
  const { email, password, name } = c.req.valid('json')

  const existing = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1)
  if (existing.length > 0) {
    return c.json({ error: 'Email already registered' }, 409)
  }

  const id = ulid()
  const now = new Date()

  await db.insert(authUsers).values({
    id,
    name,
    email,
    emailVerified: false,
    totpSecret: null,
    createdAt: now,
    updatedAt: now,
  })

  const hashedPassword = await hashPassword(password)
  await db.insert(account).values({
    id: ulid(),
    accountId: email,
    providerId: 'email',
    userId: id,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(user).values({
    id,
    role: 'client',
    email,
    firstName: name.split(' ')[0] || null,
    lastName: name.split(' ').slice(1).join(' ') || null,
    locale: 'en',
    createdAt: now.toISOString(),
    lastUpdated: now.toISOString(),
  })

  return c.json({ ok: true })
})

authRoutes.post('/sign-in/email', zValidator('json', signInSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)

  if (!authUser) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const [acc] = await db
    .select()
    .from(account)
    .where(eq(account.userId, authUser.id))
    .limit(1)

  if (!acc?.password) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const valid = await verifyPassword({ hash: acc.password, password })
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const [profile] = await db.select().from(user).where(eq(user.id, authUser.id)).limit(1)
  const role = profile?.role || 'client'

  const token = await signJwt({ sub: authUser.id, role })

  c.header('Set-Cookie', setTokenCookie(token, env.cookieSameSite, env.deploymentMode), { append: true })

  return c.json({
    user: {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role,
    },
  })
})

authRoutes.post('/sign-out', async (c) => {
  c.header('Set-Cookie', clearTokenCookie(), { append: true })
  return c.json({ ok: true })
})

authRoutes.get('/session', async (c) => {
  const token = extractTokenFromCookie(c.req.header('Cookie'))

  if (!token) {
    return c.json({ session: null, user: null })
  }

  const payload = await verifyJwt(token)
  if (!payload) {
    return c.json({ session: null, user: null })
  }

  const [authUser] = await db.select().from(authUsers).where(eq(authUsers.id, payload.sub)).limit(1)
  if (!authUser) {
    return c.json({ session: null, user: null })
  }

  const [profile] = await db.select().from(user).where(eq(user.id, authUser.id)).limit(1)

  return c.json({
    session: { userId: authUser.id, role: profile?.role || 'client' },
    user: { id: authUser.id, name: authUser.name, email: authUser.email, role: profile?.role || 'client' },
  })
})
