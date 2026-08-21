const enc = new TextEncoder()

function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const input = enc.encode(toHex(salt) + ':' + password.normalize('NFKC'))
  const hash = await crypto.subtle.digest('SHA-256', input)
  return `${toHex(salt)}:${toHex(new Uint8Array(hash))}`
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string
  password: string
}) {
  const [saltHex, keyHex] = hash.split(':')
  if (!saltHex || !keyHex) return false
  const input = enc.encode(saltHex + ':' + password.normalize('NFKC'))
  const hashBuf = await crypto.subtle.digest('SHA-256', input)
  const expected = fromHex(keyHex)
  const actual = new Uint8Array(hashBuf)
  return constantTimeEqual(expected, actual)
}
