const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const TIME_CHARS = 10
const RANDOM_CHARS = 16

function encodeTime(time: number): string {
  let result = ''
  for (let i = TIME_CHARS - 1; i >= 0; i--) {
    result = ENCODING[time % 32] + result
    time = Math.floor(time / 32)
  }
  return result
}

function encodeRandom(): string {
  const bytes = new Uint8Array(RANDOM_CHARS)
  crypto.getRandomValues(bytes)
  let result = ''
  for (const b of bytes) {
    result += ENCODING[b % 32]
  }
  return result
}

export function ulid(): string {
  const time = Date.now()
  return encodeTime(time) + encodeRandom()
}
