import { createAuthClient } from 'better-auth/client'

const baseURL = import.meta.env.VITE_API_URL || ''
const authBaseURL = baseURL ? `${baseURL.replace(/\/+$/, '')}/api/auth` : ''

export const authClient = createAuthClient({
  baseURL: authBaseURL,
})

export type SocialProvider = 'google' | 'facebook'

export function authRoute(route: string) {
  const path = route.startsWith('/') ? route.slice(1) : route
  return `${window.location.origin}/${path}`
}