import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { networkInterfaces } from 'node:os'

/** Vars/secrets from the Cloudflare dashboard or wrangler [vars] / secret put */
export interface CloudflareBindings {
  DEPLOYMENT_MODE?: string
  CORS_ORIGIN?: string
  BACKEND_URL?: string
  PORT?: string
  LOCAL_DB_PATH?: string
  DISABLE_RATE_LIMITING?: string
  DISABLE_AUTH?: string
  FRONTEND_URL?: string
  USE_LOCAL_DB?: string
  COOKIE_SAMESITE?: string
  JWT_SECRET?: string
}

/** All keys we read from Worker env — must be listed explicitly (secrets are not enumerable). */
export const BINDING_KEYS = [
  'DEPLOYMENT_MODE',
  'CORS_ORIGIN',
  'BACKEND_URL',
  'PORT',
  'LOCAL_DB_PATH',
  'DISABLE_RATE_LIMITING',
  'DISABLE_AUTH',
  'FRONTEND_URL',
  'USE_LOCAL_DB',
  'COOKIE_SAMESITE',
  'JWT_SECRET',
] as const satisfies readonly (keyof CloudflareBindings)[]

let cfBindings: CloudflareBindings = {}

function readBinding(key: keyof CloudflareBindings): string | undefined {
  const fromCf = cfBindings[key]
  if (typeof fromCf === 'string') return fromCf
  return process.env[key]
}

/**
 * Apply Worker env bindings. Cloudflare's env object is not a plain object:
 * secrets are only available via explicit property access, not Object.entries().
 */
export function applyCfBindings(bindings: CloudflareBindings) {
  cfBindings = bindings
  for (const key of BINDING_KEYS) {
    const value = bindings[key]
    if (typeof value === 'string') process.env[key] = value
  }
}

let defaultDbPath = 'file:../database/app.db'
if (typeof import.meta !== 'undefined' && import.meta.url) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  defaultDbPath = pathToFileURL(join(__dirname, '../../../database/app.db')).href
}

function getLocalIP(): string {
  if (typeof process === 'undefined' || !process.versions?.node) return '127.0.0.1'
  for (const iface of Object.values(networkInterfaces())) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address
    }
  }
  return '127.0.0.1'
}

function getCorsOrigin(): string {
  const envOrigin = readBinding('CORS_ORIGIN')
  if (envOrigin) return envOrigin
  const localIP = getLocalIP()
  return `http://${localIP}:5173`
}

function buildAllowedOrigins(): string[] {
  const envOrigin = readBinding('CORS_ORIGIN')
  if (envOrigin) {
    const origins = envOrigin.split(',').map((s) => s.trim())
    const expanded = [...origins]
    for (const o of origins) {
      if (o.startsWith('https://') && !o.includes('://www.')) {
        expanded.push(o.replace('://', '://www.'))
      } else if (o.startsWith('https://www.')) {
        expanded.push(o.replace('://www.', '://'))
      }
    }
    return expanded
  }
  const localIP = getLocalIP()
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://${localIP}:5173`,
  ]
}

/** Lazy getters — read Worker bindings first, then process.env. */
export const env = {
  get deploymentMode(): 'vps' | 'cloudflare' {
    const mode = readBinding('DEPLOYMENT_MODE')
    if (mode === 'vps' || mode === 'cloudflare') return mode
    return 'vps'
  },
  get port() {
    return Number(readBinding('PORT') ?? 8787)
  },
  get useLocalDb() {
    return readBinding('USE_LOCAL_DB') === 'true'
  },
  get localDbPath() {
    return readBinding('LOCAL_DB_PATH') ?? defaultDbPath
  },
  get corsOrigin() {
    return getCorsOrigin()
  },
  get corsOrigins() {
    return buildAllowedOrigins()
  },
  get backendUrl() {
    return readBinding('BACKEND_URL') ?? `http://localhost:${readBinding('PORT') ?? 8787}`
  },
  get disableRateLimiting() {
    return readBinding('DISABLE_RATE_LIMITING') === 'true'
  },
  get disableAuth() {
    return readBinding('DISABLE_AUTH') === 'true'
  },
  get frontendUrl() {
    return readBinding('FRONTEND_URL') ?? 'http://localhost:5173'
  },
  get cookieSameSite() {
    const v = (readBinding('COOKIE_SAMESITE') ?? 'strict').toLowerCase()
    if (v === 'lax' || v === 'none') return v
    return 'strict'
  },
  get jwtSecret() {
    return readBinding('JWT_SECRET') || 'dev-only-jwt-secret-min-32-chars!!'
  },
}