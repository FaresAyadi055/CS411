import { createMiddleware } from 'hono/factory'
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

// In-memory sliding window (VPS: single long-lived process).
// Keeps rate-limit decisions off the SQLite critical path (no per-request COUNT under lock).
const hits = new Map<string, number[]>()

function checkAndLog(ip: string, group: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const key = `${ip}:${group}`
  const recent = (hits.get(key) ?? []).filter((t) => t >= windowStart)
  const limited = recent.length >= max
  if (!limited) {
    recent.push(now)
    hits.set(key, recent)
    return false
  }

  // Non-blocking audit log for the admin view (append only, WAL-friendly).
  db.insert(rateLimitLog)
    .values({ id: ulid(), ipAddress: ip, reason: group })
    .catch(() => {})

  return true
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
