import { createMiddleware } from 'hono/factory'
import { env } from '../config/env'

function buildCsp(): string {
  const backendOrigin = env.betterAuthUrl.startsWith('http')
    ? new URL(env.betterAuthUrl).origin
    : "'self'"
  const frontendOrigin = env.frontendUrl.startsWith('http')
    ? new URL(env.frontendUrl).origin
    : "'self'"
    const directives = [
    "default-src 'self'",
    `connect-src 'self' ${backendOrigin} ${frontendOrigin}`,
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: ${backendOrigin}",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
  return directives.join('; ')
}

function setSecurityHeaders(headers: Headers) {
  headers.set('Content-Security-Policy', buildCsp())
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
}

export const securityHeadersMiddleware = createMiddleware(async (c, next) => {
  await next()
  const res = c.res
  if (res) setSecurityHeaders(res.headers)
})
