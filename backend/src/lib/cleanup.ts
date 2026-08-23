import { sql } from 'drizzle-orm'
import { db } from '../db'
import { usedQrSignatures, rateLimitLog } from '../db/schema'

const RATE_LIMIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

async function cleanExpired() {
  try {
    await db
      .delete(usedQrSignatures)
      .where(sql`${usedQrSignatures.expiresAt} < ${Date.now()}`)
  } catch (e) {
    console.error('cleanup used_qr_signatures failed:', e instanceof Error ? e.message : String(e))
  }
  try {
    const cutoff = new Date(Date.now() - RATE_LIMIT_RETENTION_MS).toISOString()
    await db
      .delete(rateLimitLog)
      .where(sql`${rateLimitLog.triggeredAt} < ${cutoff}`)
  } catch (e) {
    console.error('cleanup rate_limit_log failed:', e instanceof Error ? e.message : String(e))
  }
}

export function startCleanup() {
  const HOUR = 60 * 60 * 1000
  cleanExpired()
  setInterval(cleanExpired, HOUR)
}
