import api, { apiFetch, setOnSessionExpired, setApiAuthState } from '../lib/api'
import type { UserProfile } from '../lib/types'
import { navigate } from './router.svelte'

const PROFILE_CACHE_KEY = 'appbase_profile_cache'

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
  const ref = getReferral()
  if (!ref || !user) return
  try {
    await api.post('/api/client/cards', { referral: ref })
    setReferral(null)
  } catch {
    return true
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
  const u = getUser()
  if (u?.role === 'admin') navigate('admin', { section: 'overview' })
  else if (u?.role === 'business') navigate('dashboard')
  else navigate('qr')
}

export async function register(email: string, password: string, name: string) {
  const res = await authFetch('/api/auth/sign-up/email', { email, password, name })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, 'Registration failed'))
  }
  navigate('dashboard')
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

export async function sendResetOtp(_email: string) {
  return { message: 'OTP sent (demo)' }
}

export async function resetPassword(_email: string, _code: string, _newPassword: string) {
  return { message: 'Password reset (demo)' }
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
