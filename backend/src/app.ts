import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env, type CloudflareBindings } from './config/env'
import { sessionMiddleware } from './middleware/auth'
import { securityHeadersMiddleware } from './middleware/securityHeaders'
import type { AppVariables } from './types/app'
import { meRoutes } from './routes/me'
import { adminRoutes } from './routes/admin'
import { clientRoutes } from './routes/client'
import { publicRoutes } from './routes/public'
import { cashierRoutes } from './routes/cashier'
import { businessRoutes } from './routes/business'
import { uploadRoutes } from './routes/uploads'
import { authRoutes } from './routes/auth'
import { db } from './db'
import { user as userSchema } from './db/schema'

function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)
}

export function createApp() {
  const app = new Hono<{ Bindings: CloudflareBindings; Variables: AppVariables }>()

  if (env.deploymentMode === 'cloudflare') {
    console.log('CORS config:', { corsOrigin: env.corsOrigin, corsOrigins: env.corsOrigins })
  }

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin || origin === 'null') return null
        if (isLocalOrigin(origin)) return origin
        if (env.corsOrigins.includes(origin)) return origin
        try {
          if (env.corsOrigin && new URL(origin).origin === new URL(env.corsOrigin).origin) return origin
        } catch {}
        return null
      },
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    }),
  )

  app.use('*', securityHeadersMiddleware)

  app.use('*', async (c, next) => {
    const id = crypto.randomUUID().slice(0, 8)
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    console.log(`[${id}] ${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`)
  })

  app.get('/health', async (c) => {
    try {
      await db.select().from(userSchema).limit(1)
      return c.json({ ok: true, db: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('health db check failed:', message)
      return c.json({ ok: false, db: false }, 503)
    }
  })

  app.route('/api/auth', authRoutes)

  app.use('/api/me/*', sessionMiddleware)
  app.use('/api/admin/*', sessionMiddleware)
  app.use('/api/client/*', sessionMiddleware)
  app.use('/api/cashier/*', sessionMiddleware)
  app.use('/api/business/*', sessionMiddleware)
  app.use('/api/uploads/*', sessionMiddleware)

  app.route('/api/me', meRoutes)
  app.route('/api/admin', adminRoutes)
  app.route('/api/client', clientRoutes)
  app.route('/api/public', publicRoutes)
  app.route('/api/cashier', cashierRoutes)
  app.route('/api/business', businessRoutes)
  app.route('/api/uploads', uploadRoutes)

  app.notFound((c) => c.json({ error: 'Not found' }, 404))

  app.onError((err, c) => {
    console.error('[500]', err?.name, err?.message)
    const isProd = env.deploymentMode === 'cloudflare'
    if (!isProd) console.error(err?.stack)
    return c.json({ error: err?.message || 'Internal server error' }, 500)
  })

  return app
}