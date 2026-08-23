import api, { apiFetch, setOnSessionExpired, setApiAuthState } from '../lib/api'
import type { UserProfile } from '../lib/types'
import { authClient, type SocialProvider } from '../lib/auth-client'
import { navigate } from './router.svelte'
import { getLocale } from '../lib/i18n.svelte'

export type { SocialProvider }

const PROFILE_CACHE_KEY = 'appbase_profile_cache'
const LAST_LOGIN_METHOD_KEY = 'appbase_last_login'
const PENDING_PROVIDER_KEY = 'appbase_pending_provider'

export type LoginMethod = 'email' | 'google' | 'facebook'

export function getLastLoginMethod(): LoginMethod | null {
  return localStorage.getItem(LAST_LOGIN_METHOD_KEY) as LoginMethod | null
}

export function setLastLoginMethod(method: LoginMethod) {
  localStorage.setItem(LAST_LOGIN_METHOD_KEY, method)
}

function readProfileCache(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function writeProfileCache(profile: UserProfile | null) {
  if (profile) sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
  else sessionStorage.removeItem(PROFILE_CACHE_KEY)
}

let user = $state<UserProfile | null>(readProfileCache())
let loading = $state(false)

setOnSessionExpired(() => {
  user = null
  writeProfileCache(null)
  setApiAuthState(false)
})

export async function checkSession() {
  loading = true
  try {
    const data = await api.get<{ profile: UserProfile }>('/api/me')
    user = data.profile
    writeProfileCache(data.profile)
    setApiAuthState(true)
    await applyReferral()
  } catch {
    user = null
    writeProfileCache(null)
    setApiAuthState(false)
  } finally {
    loading = false
  }
}

async function applyReferral() {
  if (!user) return
  const ref = getReferral()
  if (!ref) return
  const ok = await subscribeToMerchant(ref)
  if (ok) setReferral(null)
}

export async function subscribeToMerchant(merchantRef: string): Promise<boolean> {
  try {
    await api.post('/api/client/subscribe', { merchantId: merchantRef })
    return true
  } catch {
    return false
  }
}

export function getReferral(): string | null {
  let ref = new URLSearchParams(window.location.search).get('ref')
  if (!ref) {
    const hash = window.location.hash
    const q = hash.indexOf('?')
    if (q !== -1) ref = new URLSearchParams(hash.slice(q + 1)).get('ref')
  }
  if (ref) {
    localStorage.setItem('fidelito_referral', ref)
    return ref
  }
  return localStorage.getItem('fidelito_referral')
}

export function setReferral(ref: string | null) {
  if (ref) localStorage.setItem('fidelito_referral', ref)
  else localStorage.removeItem('fidelito_referral')
}

async function authFetch(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
}

function extractError(body: Record<string, unknown>, fallback: string): string {
  return (body.message as string) || (body.error as string) || fallback
}

export async function login(email: string, password: string) {
  let res: Response
  try {
    res = await authFetch('/api/auth/sign-in/email', { email, password })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Login timed out. Check your connection and try again.')
    }
    throw e
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, 'Login failed'))
  }
  setApiAuthState(true)
  await checkSession()
  if (!user) {
    throw new Error('Could not load your profile. Try again.')
  }
}

export async function register(email: string, password: string, name: string) {
  const res = await authFetch('/api/auth/sign-up/email', { email, password, name })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, 'Registration failed'))
  }
}

export function getAuthErrorFromUrl(): string | null {
  const hash = window.location.hash
  const qIndex = hash.indexOf('?')
  if (qIndex === -1) return null
  const params = new URLSearchParams(hash.slice(qIndex + 1))
  return params.get('error_description') || params.get('error')
}

export function clearAuthErrorFromUrl() {
  const hash = window.location.hash
  const qIndex = hash.indexOf('?')
  if (qIndex === -1) return
  window.location.hash = hash.slice(0, qIndex)
}

export async function socialLogin(provider: SocialProvider, callbackURL?: string) {
  sessionStorage.setItem(PENDING_PROVIDER_KEY, provider)
  const cb = callbackURL || `${window.location.origin}/oauth-callback`
  const res = await apiFetch('/api/auth/sign-in/social', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, callbackURL: cb, errorCallbackURL: cb }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || 'Failed to start social login')
  }
  const data = (await res.json()) as { url?: string; redirect?: boolean }
  if (data.url) {
    window.location.href = data.url
  }
}

/** Called when the OAuth popup signals completion. Uses cookies (not localStorage token). */
export async function resolveOAuthSession() {
  loading = true
  try {
    const res = await apiFetch('/api/auth/get-session', {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { message?: string }).message || 'Could not verify session after sign in')
    }

    setApiAuthState(true)
    await checkSession()
    if (user) {
      const pending = sessionStorage.getItem(PENDING_PROVIDER_KEY)
      if (pending) {
        setLastLoginMethod(pending as LoginMethod)
        sessionStorage.removeItem(PENDING_PROVIDER_KEY)
      }
      socialLoginRedirect()
    }
  } finally {
    loading = false
  }
}

export function socialLoginRedirect() {
  if (user) {
    if (user.role === 'admin') {
      navigate('admin', { section: 'overview' })
      return
    }
    if (user.role === 'business') {
      navigate('dashboard')
      return
    }
    if (user.role === 'cashier') {
      navigate('scan')
      return
    }
    navigate('qr')
  }
}

export async function logout() {
  try {
    await api.post('/api/auth/sign-out', {})
  } catch {}
  user = null
  writeProfileCache(null)
  setApiAuthState(false)
}

export function getUser() {
  return user
}

export function isLoading() {
  return loading
}

export function isAuthenticated() {
  return user !== null
}

export function hasRole(role: string) {
  return user?.role === role
}

async function otpFetch(path: string, body: unknown) {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Request failed')
  }
  return data as { message: string }
}

export async function sendVerificationOtp(email: string) {
  return otpFetch('/api/auth/otp/send-verification', { email, locale: getLocale() })
}

export async function verifyEmailOtp(email: string, code: string) {
  return otpFetch('/api/auth/otp/verify-email', { email, code })
}

export async function sendResetOtp(email: string) {
  return otpFetch('/api/auth/otp/send-reset', { email, locale: getLocale() })
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  return otpFetch('/api/auth/otp/reset-password', { email, code, newPassword })
}

export { authClient }