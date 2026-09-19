export const TOKEN_COOKIE_NAME = 'fid_token'

export function extractTokenFromCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined
  return cookieHeader.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(TOKEN_COOKIE_NAME + '='))?.split('=')[1]
}

export function setTokenCookie(token: string, sameSite: string, deploymentMode: string): string {
  const parts = [
    `${TOKEN_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=' + sameSite,
    'Max-Age=' + (7 * 24 * 60 * 60),
  ]
  if (deploymentMode === 'cloudflare') parts.push('Secure')
  return parts.join('; ')
}

export function clearTokenCookie(): string {
  return `${TOKEN_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`
}
