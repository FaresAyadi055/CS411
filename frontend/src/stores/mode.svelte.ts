import { getUser } from './auth.svelte'

const KEY = (id?: string) => `fidelito_as_client_${id ?? 'guest'}`

let asClient = $state(false)
let syncedFor: string | null = null

export function isClientView() {
  const user = getUser()
  if (!user) return false
  if (user.role === 'client' || user.role === 'admin') return false
  return asClient
}

export function toggleClientView() {
  const user = getUser()
  if (!user) return
  asClient = !asClient
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY(user.id), asClient ? '1' : '0')
  }
}

export function resetViewMode() {
  asClient = false
  syncedFor = null
  const user = getUser()
  if (user && typeof localStorage !== 'undefined') localStorage.removeItem(KEY(user.id))
}

export function syncViewMode() {
  const user = getUser()
  if (!user) return
  if (syncedFor === user.id) return
  syncedFor = user.id
  let stored: string | null = '0'
  if (typeof localStorage !== 'undefined') stored = localStorage.getItem(KEY(user.id))
  asClient = stored === '1'
}
