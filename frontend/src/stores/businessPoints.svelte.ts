import { api } from '../lib/api'
import type { Merchant } from '../lib/types'

let businessPoints = $state<number | null>(null)

export function getBusinessPoints() {
  return businessPoints
}

export function setBusinessPoints(n: number | null) {
  businessPoints = n
}

export async function refreshBusinessPoints() {
  try {
    const d = await api.get<{ merchant: Merchant }>('/api/cashier/merchant')
    businessPoints = Math.max(0, d.merchant.pointsBalance)
  } catch {}
}
