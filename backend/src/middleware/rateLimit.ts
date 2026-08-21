import { createMiddleware } from 'hono/factory'
import { eq, and, gte, sql } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '../db'
import { rateLimitLog } from '../db/schema'
import type { AppVariables } from '../types/app'
import { env } from '../config/env'

type LimitConfig = { pattern: RegExp; group: string; max: number; windowMs: number; silent?: boolean }

const LIMITS: LimitConfig[] = [
  { pattern: /\/otp\/(send-verification|send-reset)/, group: 'otp-send', max: 3, windowMs: 15 * 60_000 },
  { pattern: /\/otp\/(verify-email|reset-password)/, group: 'otp-verify', max: 5, windowMs: 15 * 60_000 },
  { pattern: /^\/api\/auth/, group: 'auth', max: 10, windowMs: 15 * 60_000 },
  { pattern: /^\/api/, group: 'api', max: 100, windowMs: 15 * 60_000 },
]

function getLimit(path: string): LimitConfig {
  for (const l of LIMITS) {
    if (l.pattern.test(path)) return l
  }
  return { pattern: /^\/api/, group: 'api', max: 100, windowMs: 15 * 60_000 }
}

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

const RATE_LIMIT_DB_FAILED = new Set<string>()

async function checkAndLog(ip: string, group: string, max: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString()
  const key = `${ip}:${group}`
  if (RATE_LIMIT_DB_FAILED.has(key)) return false
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateLimitLog)
      .where(and(
        eq(rateLimitLog.ipAddress, ip),
        eq(rateLimitLog.reason, group),
        gte(rateLimitLog.triggeredAt, windowStart),
      ))
    const count = row?.count ?? 0
    if (count >= max) return true
    await db.insert(rateLimitLog).values({ id: ulid(), ipAddress: ip, reason: group })
    return false
  } catch {
    RATE_LIMIT_DB_FAILED.add(key)
    return false
  }
}

export const rateLimitMiddleware = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    if (env.disableRateLimiting) {
      await next()
      return
    }

    const path = new URL(c.req.url).pathname
    if (!path.startsWith('/api')) {
      await next()
      return
    }

    const { group, max, windowMs, silent } = getLimit(path)
    const ip = clientIp(c)

    const limited = await checkAndLog(ip, group, max, windowMs)
    if (limited) {
      if (silent) {
        c.set('rateLimited', true)
        await next()
        return
      }
      return c.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, 429)
    }

    await next()
  },
)
