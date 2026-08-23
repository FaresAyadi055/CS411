import { api } from '../lib/api'
import type { AppNotification } from '../lib/types'

export const notif = $state<{ unreadCount: number }>({ unreadCount: 0 })

export async function refreshUnread(): Promise<void> {
  try {
    const res = await api.get<{ count: number }>('/notifications/unread')
    notif.unreadCount = res.count ?? 0
  } catch {
    notif.unreadCount = 0
  }
}

export async function fetchNotifications(
  limit = 50,
  cursor?: number,
): Promise<{ notifications: AppNotification[]; nextCursor: number | null }> {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (cursor !== undefined) params.set('cursor', String(cursor))
  const res = await api.get<{
    notifications: AppNotification[]
    nextCursor: number | null
  }>(`/notifications?${params.toString()}`)
  return { notifications: res.notifications ?? [], nextCursor: res.nextCursor ?? null }
}

export async function markRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`, {})
  notif.unreadCount = Math.max(0, notif.unreadCount - 1)
}

export async function markAllRead(): Promise<void> {
  await api.post('/notifications/read-all', {})
  notif.unreadCount = 0
}
