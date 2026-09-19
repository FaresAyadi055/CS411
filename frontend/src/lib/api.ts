let BASE = import.meta.env.VITE_API_URL ?? ''
console.log('API BASE:', BASE)

export function getApiBase() {
  return BASE
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(`${BASE}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 15_000
const PERSIST_TTL = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 10_000

// Endpoints with live/secret data that must not be served from a stale cache.
const CACHE_EXCLUDED = ['/api/client/qr']

function isExcluded(path: string): boolean {
  return CACHE_EXCLUDED.some((p) => path.includes(p))
}

function persistKey(key: string): string {
  return `fidelito_cache_${key}`
}

function readPersisted(key: string): { data: unknown; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(persistKey(key))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writePersisted(key: string, data: unknown) {
  try {
    localStorage.setItem(persistKey(key), JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    /* storage full or unavailable — ignore */
  }
}

function clearPersisted() {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('fidelito_cache_')) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

function resourcePrefix(path: string): string {
  const norm = path.startsWith('/') ? path : `/${path}`
  return `/${norm.split('/').slice(1, 3).join('/')}`
}

function clearCache(prefix?: string) {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    const k = BASE ? key.slice(BASE.length) : key
    if (k.startsWith(prefix)) cache.delete(key)
  }
}

let _onSessionExpired: (() => void) | null = null
let _onRequestError: ((e: { message: string; status: number; code?: string }) => void) | null = null
let _authed = true

export function setOnSessionExpired(fn: () => void) {
  _onSessionExpired = fn
}

export function setOnRequestError(fn: (e: { message: string; status: number; code?: string }) => void) {
  _onRequestError = fn
}

export function setApiAuthState(authed: boolean) {
  _authed = authed
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const isGet = !options.method || options.method === 'GET'
  const key = `${BASE}${path}`
  const excluded = isExcluded(path)

  if (isGet && !excluded) {
    const entry = cache.get(key)
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T
    }
  }

  const creds: RequestCredentials = 'include'

  let res: Response
  try {
    res = await apiFetch(path, { ...options, headers, credentials: creds })
  } catch {
    if (isGet && !excluded) {
      const persisted = readPersisted(key)
      if (persisted) return persisted.data as T
    }
    const msg = 'Network error'
    _onRequestError?.({ message: msg, status: 0 })
    throw new ApiRequestError(msg, 0)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = (body.message as string) || (body.error as string) || res.statusText

    console.error('[API]', res.status, path, body)

    if (res.status === 401) {
      clearSession()
    } else {
      _onRequestError?.({ message: msg, status: res.status, code: body.code as string })
    }

    throw new ApiRequestError(msg, res.status, body.code as string)
  }

  const data = await res.json()

  if (isGet && !excluded) {
    cache.set(key, { data, timestamp: Date.now() })
    writePersisted(key, data)
  } else if (!isGet) {
    clearCache(resourcePrefix(path))
  }

  return data
}

export class ApiRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
  }
}

export function clearSession() {
  cache.clear()
  clearPersisted()
  _onSessionExpired?.()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getPublic: <T>(path: string) => request<T>(path, { credentials: 'omit' }),
  postPublic: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
      credentials: 'omit',
    }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<T>(path, { method: 'POST', body: form })
  },
}

export function invalidateCache(prefix?: string) {
  clearCache(prefix)
}

export default api
