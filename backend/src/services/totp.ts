const DIGITS = 6
const PERIOD = 30
const WINDOW = 1
const ALGORITHM = 'SHA-1'
const SECRET_BYTES = 20

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i] >> 3]
  }
  return result
}

function base32Decode(secret: string): Uint8Array {
  const cleaned = secret.replace(/[=]/g, '').toUpperCase()
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char)
    if (idx === -1) throw new Error('Invalid base32 character')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >>> bits) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8)
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff
    num = Math.floor(num / 256)
  }
  return bytes
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: ALGORITHM },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer)
  return new Uint8Array(sig)
}

function dynamicTruncation(hash: Uint8Array): number {
  const offset = hash[hash.length - 1] & 0x0f
  return (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  )
}

export async function generateTotp(secret: string, timestamp?: number): Promise<string> {
  const time = timestamp ?? Date.now()
  const timeStep = Math.floor(time / 1000 / PERIOD)
  const key = base32Decode(secret)
  const msg = intToBytes(timeStep)
  const hash = await hmacSha1(key, msg)
  const code = dynamicTruncation(hash) % Math.pow(10, DIGITS)
  return code.toString().padStart(DIGITS, '0')
}

export async function verifyTotp(secret: string, code: string, tolerance: number = WINDOW): Promise<boolean> {
  const timeStep = Math.floor(Date.now() / 1000 / PERIOD)
  for (let i = -tolerance; i <= tolerance; i++) {
    const testTime = (timeStep + i) * PERIOD * 1000
    const expected = await generateTotp(secret, testTime)
    if (expected === code) return true
  }
  return false
}

export function buildQrPayload(userId: string, totp: string): string {
  return JSON.stringify({ v: 1, u: userId, t: totp, ts: Date.now() })
}

export function parseQrPayload(raw: string): { v: number; u: string; t: string; ts: number } | null {
  try {
    const data = JSON.parse(raw)
    if (data.v !== 1 || !data.u || !data.t || typeof data.ts !== 'number') return null
    return data
  } catch {
    return null
  }
}

export function getSignature(userId: string, timestamp: number): string {
  const timeStep = Math.floor(timestamp / 1000 / PERIOD)
  return `${userId}:${timeStep}`
}

export { PERIOD, DIGITS }
