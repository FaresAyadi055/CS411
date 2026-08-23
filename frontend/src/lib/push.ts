import { VAPID_PUBLIC_KEY } from './config'
import api from './api'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** Requests notification permission and stores the push subscription. Returns true on success. */
export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) return false
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'denied') return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    const sub =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }))
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    await api.post('/api/client/push/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    })
    return true
  } catch {
    return false
  }
}
