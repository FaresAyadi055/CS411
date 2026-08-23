import webpush from 'web-push'
import { db } from '../db'
import { pushSubscriptions, user } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import { env } from '../config/env'

let configured = false
function ensureConfigured() {
  if (configured) return
  if (env.vapidPublicKey && env.vapidPrivateKey) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey)
    configured = true
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  ensureConfigured()
  if (!configured) return

  const subs = await db
    .select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
    .from(pushSubscriptions)
    .innerJoin(user, eq(pushSubscriptions.userId, user.id))
    .where(and(eq(pushSubscriptions.userId, userId), eq(user.notificationsEnabled, true)))

  if (subs.length === 0) return

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/#notifications',
    tag: payload.tag ?? 'fidelito',
  })

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        )
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint))
        }
      }
    }),
  )
}
