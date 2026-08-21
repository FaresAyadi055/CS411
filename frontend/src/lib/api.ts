let BASE = import.meta.env.VITE_API_URL
if (!BASE) BASE = ''

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
const REQUEST_TIMEOUT_MS = 10_000

function clearCache() {
  cache.clear()
}

let _onSessionExpired: (() => void) | null = null
let _authed = true

export function setOnSessionExpired(fn: () => void) {
  _onSessionExpired = fn
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

  if (isGet) {
    const entry = cache.get(key)
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T
    }
  }

  const creds: RequestCredentials = options.credentials ?? (_authed ? 'include' : 'omit')
  const res = await apiFetch(path, { ...options, headers, credentials: creds })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = (body.message as string) || (body.error as string) || res.statusText

    if (res.status === 401) {
      clearSession()
    }

    throw new ApiRequestError(msg, res.status, body.code as string)
  }

  const data = await res.json()

  if (isGet) {
    cache.set(key, { data, timestamp: Date.now() })
  } else {
    clearCache()
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

export function invalidateCache() {
  clearCache()
}

export default api
