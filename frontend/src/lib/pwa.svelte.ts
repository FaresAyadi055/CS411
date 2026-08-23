type PwaState = {
  deferredPrompt: any
  installed: boolean
  isIos: boolean
  notifPermission: NotificationPermission
  installAskedAt: number | null
  notifAskedAt: number | null
}

const REASK_DAYS = 7
const DAY_MS = 86400000

export const pwa = $state<PwaState>({
  deferredPrompt: null,
  installed: false,
  isIos: false,
  notifPermission: 'default',
  installAskedAt: null,
  notifAskedAt: null,
})

function readStamp(key: string): number | null {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function writeStamp(key: string, value: number) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value))
}

export function initPwa() {
  if (typeof window === 'undefined') return
  pwa.installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.startsWith('android-app://')
  pwa.isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  pwa.notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  pwa.installAskedAt = readStamp('pwa_install_asked')
  pwa.notifAskedAt = readStamp('pwa_notif_asked')

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    pwa.deferredPrompt = e
  })
  window.addEventListener('appinstalled', () => {
    pwa.installed = true
    pwa.deferredPrompt = null
  })
  if (typeof Notification !== 'undefined') {
    navigator.permissions?.query({ name: 'notifications' as PermissionName }).then((status) => {
      status.onchange = () => (pwa.notifPermission = Notification.permission)
    }).catch(() => {})
  }
}

function canReask(askedAt: number | null): boolean {
  if (askedAt === null) return true
  return Date.now() - askedAt > REASK_DAYS * DAY_MS
}

export function shouldShowInstall(): boolean {
  if (pwa.installed) return false
  if (!pwa.deferredPrompt && !pwa.isIos) return false
  return canReask(pwa.installAskedAt)
}

export function shouldShowNotif(): boolean {
  if (pwa.notifPermission !== 'default') return false
  return canReask(pwa.notifAskedAt)
}

export function markInstallAsked() {
  const now = Date.now()
  pwa.installAskedAt = now
  writeStamp('pwa_install_asked', now)
}

export function markNotifAsked() {
  const now = Date.now()
  pwa.notifAskedAt = now
  writeStamp('pwa_notif_asked', now)
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (pwa.isIos || !pwa.deferredPrompt) return null
  try {
    await pwa.deferredPrompt.prompt()
    const choice = await pwa.deferredPrompt.userChoice
    pwa.deferredPrompt = null
    markInstallAsked()
    if (choice.outcome === 'accepted') {
      pwa.installed = true
      return 'accepted'
    }
    return 'dismissed'
  } catch {
    markInstallAsked()
    return 'dismissed'
  }
}
