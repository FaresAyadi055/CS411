import { env } from './config/env'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function base64UrlEncode(data: Uint8Array): string {
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(env.jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export interface JwtPayload {
  sub: string
  role: string
  iat: number
  exp: number
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const full: JwtPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 }

  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = base64UrlEncode(encoder.encode(JSON.stringify(full)))
  const data = `${header}.${body}`

  const key = await getKey()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))

  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return null

    const key = await getKey()
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(sig),
      encoder.encode(`${header}.${body}`),
    )
    if (!valid) return null

    const payload: JwtPayload = JSON.parse(decoder.decode(base64UrlDecode(body)))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}
