import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { networkInterfaces } from 'node:os'

/** Vars/secrets from the Cloudflare dashboard or wrangler [vars] / secret put */
export interface CloudflareBindings {
  DEPLOYMENT_MODE?: string
  TURSO_SQLITE_DATABASE_URL?: string
  TURSO_TOKEN?: string
  CORS_ORIGIN?: string
  RESEND_API_KEY?: string
  RESEND_FROM?: string
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  FACEBOOK_CLIENT_ID?: string
  FACEBOOK_CLIENT_SECRET?: string
  PORT?: string
  LOCAL_DB_PATH?: string
  DISABLE_RATE_LIMITING?: string
  DISABLE_AUTH?: string
  FRONTEND_URL?: string
  USE_LOCAL_DB?: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT?: string
}

/** All keys we read from Worker env — must be listed explicitly (secrets are not enumerable). */
export const BINDING_KEYS = [
  'DEPLOYMENT_MODE',
  'TURSO_SQLITE_DATABASE_URL',
  'TURSO_TOKEN',
  'CORS_ORIGIN',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'PORT',
  'LOCAL_DB_PATH',
  'DISABLE_RATE_LIMITING',
  'DISABLE_AUTH',
  'FRONTEND_URL',
  'USE_LOCAL_DB',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
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
  defaultDbPath = 'file:/' + join(__dirname, '../../../database/app.db').replace(/\\/g, '/')
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
    if (readBinding('TURSO_SQLITE_DATABASE_URL') && readBinding('TURSO_TOKEN')) {
      return 'cloudflare'
    }
    return 'vps'
  },
  get port() {
    return Number(readBinding('PORT') ?? 8787)
  },
  get tursoUrl() {
    return readBinding('TURSO_SQLITE_DATABASE_URL')
  },
  get tursoToken() {
    return readBinding('TURSO_TOKEN')
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
  get resendApiKey() {
    return readBinding('RESEND_API_KEY') ?? ''
  },
  get betterAuthSecret() {
    return (
      readBinding('BETTER_AUTH_SECRET') || 'dev-only-better-auth-secret-min-32-chars!'
    )
  },
  get betterAuthUrl() {
    return readBinding('BETTER_AUTH_URL') ?? `http://localhost:${readBinding('PORT') ?? 8787}`
  },
  get resendFrom() {
    return readBinding('RESEND_FROM') ?? 'AppBase <no-reply@example.com>'
  },
  get googleClientId() {
    return readBinding('GOOGLE_CLIENT_ID') ?? ''
  },
  get googleClientSecret() {
    return readBinding('GOOGLE_CLIENT_SECRET') ?? ''
  },
  get facebookClientId() {
    return readBinding('FACEBOOK_CLIENT_ID') ?? ''
  },
  get facebookClientSecret() {
    return readBinding('FACEBOOK_CLIENT_SECRET') ?? ''
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
  get vapidPublicKey() {
    return readBinding('VAPID_PUBLIC_KEY') ?? ''
  },
  get vapidPrivateKey() {
    return readBinding('VAPID_PRIVATE_KEY') ?? ''
  },
  get vapidSubject() {
    return readBinding('VAPID_SUBJECT') ?? 'mailto:hello@fidelito.tn'
  },
}