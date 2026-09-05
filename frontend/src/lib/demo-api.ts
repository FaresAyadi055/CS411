import demoCredentials from '../data/demo-credentials.json'
import type { UserProfile } from './types'

const DEMO_USERS: Record<string, UserProfile> = Object.fromEntries(
  demoCredentials.map((c) => [
    c.email,
    {
      id: crypto.randomUUID(),
      email: c.email,
      firstName: c.name.split(' ')[0],
      lastName: c.name.split(' ').slice(1).join(' '),
      role: c.role as UserProfile['role'],
      locale: 'en',
      notificationsEnabled: true,
      createdAt: new Date().toISOString(),
    },
  ])
)

const DEMO_MERCHANT = {
  id: 'demo-merchant-1',
  ownerId: DEMO_USERS['business@example.com']!.id,
  name: 'Cafe Bonjour',
  slug: 'cafe-bonjour',
  logoUrl: null as string | null,
  stampsPerReward: 10,
  planTier: 'growth' as const,
  pointsBalance: 500,
  pointsFunded: 1000,
  isActive: true,
  address: '12 Rue de la Paix, Tunis',
  lat: 36.8065,
  lng: 10.1815,
  createdAt: Date.now() - 86400000 * 30,
  updatedAt: Date.now(),
}

const DEMO_REWARDS = [
  { id: 'r1', merchantId: DEMO_MERCHANT.id, title: 'Free Coffee', description: 'Any small coffee on the house', stampsCost: 10, imageUrl: null, isAvailable: true, canRedeem: false, createdAt: Date.now() - 86400000 * 20 },
  { id: 'r2', merchantId: DEMO_MERCHANT.id, title: 'Free Pastry', description: 'Choice of croissant or muffin', stampsCost: 20, imageUrl: null, isAvailable: true, canRedeem: false, createdAt: Date.now() - 86400000 * 15 },
]

const DEMO_STAFF = [
  { id: 's1', userId: DEMO_USERS['business@example.com']!.id, role: 'owner' as const, createdAt: Date.now() - 86400000 * 30, firstName: 'Samir', lastName: 'Trabelsi', email: 'business@example.com', pointsAwarded: 45, mealAwarded: 0, transactionCount: 12 },
  { id: 's2', userId: DEMO_USERS['cashier@example.com']!.id, role: 'cashier' as const, createdAt: Date.now() - 86400000 * 20, firstName: 'Leila', lastName: 'Benali', email: 'cashier@example.com', pointsAwarded: 120, mealAwarded: 0, transactionCount: 58 },
]

const DEMO_CARDS = [
  { id: 'c1', customerId: DEMO_USERS['client@example.com']!.id, merchantId: DEMO_MERCHANT.id, merchantName: DEMO_MERCHANT.name, merchantLogo: null, fidelityPoints: 7, mealVoucherBalance: 0, lifetimePoints: 15, mealVoucherTotal: 0, lastVisitAt: Date.now() - 86400000 * 2, createdAt: Date.now() - 86400000 * 25, updatedAt: Date.now() - 86400000 * 2 },
]

const DEMO_TRANSACTIONS = [
  { id: 't1', merchantId: DEMO_MERCHANT.id, customerId: DEMO_USERS['client@example.com']!.id, cashierId: DEMO_USERS['cashier@example.com']!.id, type: 'EARN_STAMP' as const, stampsCount: 3, createdAt: Date.now() - 86400000 * 2, customerFirstName: 'Ahmed', customerLastName: 'Mansour', customerName: 'Ahmed Mansour', cashierName: 'Leila Benali' },
  { id: 't2', merchantId: DEMO_MERCHANT.id, customerId: DEMO_USERS['client@example.com']!.id, cashierId: DEMO_USERS['cashier@example.com']!.id, type: 'EARN_STAMP' as const, stampsCount: 4, createdAt: Date.now() - 86400000 * 5, customerFirstName: 'Ahmed', customerLastName: 'Mansour', customerName: 'Ahmed Mansour', cashierName: 'Leila Benali' },
  { id: 't3', merchantId: DEMO_MERCHANT.id, customerId: DEMO_USERS['client@example.com']!.id, cashierId: DEMO_USERS['cashier@example.com']!.id, type: 'EARN_STAMP' as const, stampsCount: 1, createdAt: Date.now() - 86400000 * 8, customerFirstName: 'Ahmed', customerLastName: 'Mansour', customerName: 'Ahmed Mansour', cashierName: 'Leila Benali' },
]

const DEMO_DAILY_ACTIVITY = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
  earned: Math.floor(Math.random() * 8) + 1,
  redeemed: Math.floor(Math.random() * 3),
}))

const DEMO_DASHBOARD = {
  totalPointsAdded: 165,
  totalMealVoucherAdded: 0,
  pointsRedeemed: 30,
  mealVoucherRedeemed: 0,
  redemptionsCount: 3,
  uniqueCustomers: 12,
  newCustomersThisWeek: 2,
  pointsBalance: 500,
  pointsFunded: 1000,
  pointsGiven: 165,
  transactionsToday: 3,
  transactionsThisWeek: 8,
  transactionsPrevWeek: 5,
  transactionsThisMonth: 28,
  dailyActivity: DEMO_DAILY_ACTIVITY,
  hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: h >= 8 && h <= 20 ? Math.floor(Math.random() * 5) : 0 })),
  weekdayDistribution: Array.from({ length: 7 }, (_, d) => ({ day: d, count: Math.floor(Math.random() * 10) + 2 })),
  topCustomers: [
    { customerId: DEMO_USERS['client@example.com']!.id, firstName: 'Ahmed', lastName: 'Mansour', fidelityPoints: 7, mealVoucherBalance: 0, lifetimePoints: 15 },
  ],
  topRewards: [{ rewardId: 'r1', title: 'Free Coffee', redemptions: 2 }],
  recentTransactions: DEMO_TRANSACTIONS.map((t) => ({ id: t.id, type: t.type, balanceType: 'fidelity' as const, amount: t.stampsCount, createdAt: t.createdAt, customerName: t.customerName!, rewardTitle: null })),
}

const DEMO_SESSION_KEY = 'appbase_profile_cache'

let currentUser: UserProfile | null = (() => {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
})()

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function match(path: string, pattern: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  if (patternParts.length !== pathParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i]
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

function resolveBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try { return JSON.parse(body) } catch { return {} }
  }
  return (body as Record<string, unknown>) ?? {}
}

export function installDemoFetch() {
  const originalFetch = window.fetch

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = resolveBody(init?.body)

    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]

    if (method === 'POST' && path === '/api/auth/sign-in/email') {
      const { email, password } = body as { email: string; password: string }
      const cred = demoCredentials.find((c) => c.email === email)
      if (!cred || cred.password !== password) return json({ message: 'Invalid email or password' }, 401)
      currentUser = { ...DEMO_USERS[email]! }
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(currentUser))
      return json({ message: 'ok' })
    }

    if (method === 'POST' && path === '/api/auth/sign-up/email') {
      const { email, name } = body as { email: string; name: string }
      if (DEMO_USERS[email]) return json({ message: 'User already exists' }, 409)
      const role = email.includes('admin') ? 'admin' : email.includes('business') ? 'business' : email.includes('cashier') ? 'cashier' : 'client'
      const user: UserProfile = { id: crypto.randomUUID(), email, firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' '), role, locale: 'en', notificationsEnabled: true, createdAt: new Date().toISOString() }
      DEMO_USERS[email] = user
      currentUser = user
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user))
      return json({ message: 'ok' })
    }

    if (method === 'POST' && path === '/api/auth/sign-out') {
      currentUser = null
      sessionStorage.removeItem(DEMO_SESSION_KEY)
      return json({ message: 'ok' })
    }

    if (path === '/api/me') {
      if (method === 'GET') {
        if (!currentUser) return json({ message: 'Unauthorized' }, 401)
        return json({ profile: currentUser })
      }
      if (method === 'PATCH') {
        if (!currentUser) return json({ message: 'Unauthorized' }, 401)
        Object.assign(currentUser, body)
        return json({ profile: currentUser })
      }
    }

    if (method === 'GET' && path === '/api/client/qr/current') {
      const totp = String(Math.floor(100000 + Math.random() * 900000))
      return json({ totp, remainingSeconds: 30 - (Math.floor(Date.now() / 1000) % 30), payload: JSON.stringify({ v: 1, u: currentUser?.id, t: totp, ts: Date.now() }) })
    }

    if (method === 'POST' && path === '/api/client/qr/provision') {
      return json({ secret: 'JBSWY3DPEHPK3PXP', qrDataUri: 'data:image/png;base64,iVBOR' })
    }

    if (method === 'GET' && path === '/api/client/cards') {
      return json({ cards: DEMO_CARDS })
    }

    if (path.startsWith('/api/client/cards/')) {
      const params = match(path, '/api/client/cards/:merchantId')
      if (params && method === 'GET') {
        const card = DEMO_CARDS.find((c) => c.merchantId === params.merchantId)
        return json({ card: card ?? null, transactions: DEMO_TRANSACTIONS.filter((t) => t.merchantId === params.merchantId), rewards: DEMO_REWARDS, isSubscribed: true })
      }
    }

    if (method === 'GET' && path === '/api/client/transactions') {
      return json({ transactions: DEMO_TRANSACTIONS })
    }

    if (method === 'GET' && path === '/api/client/merchants') {
      return json({ merchants: [DEMO_MERCHANT] })
    }

    if (method === 'POST' && path === '/api/client/subscribe') {
      return json({ message: 'ok' })
    }

    if (method === 'GET' && path === '/api/cashier/merchant') {
      return json({ merchant: DEMO_MERCHANT })
    }

    if (method === 'POST' && path === '/api/cashier/verify') {
      return json({ customer: { firstName: 'Ahmed', lastName: 'Mansour', email: 'client@example.com' }, card: DEMO_CARDS[0], rewards: DEMO_REWARDS })
    }

    if (method === 'GET' && path === '/api/cashier/rewards') {
      return json({ rewards: DEMO_REWARDS })
    }

    if (method === 'POST' && path === '/api/cashier/adjust') {
      const { fidelityPoints, mealVoucherBalance } = body as { fidelityPoints?: number; mealVoucherBalance?: number }
      const card = DEMO_CARDS[0]
      if (fidelityPoints !== undefined) card.fidelityPoints = Math.max(0, card.fidelityPoints + fidelityPoints)
      if (mealVoucherBalance !== undefined) card.mealVoucherBalance = Math.max(0, card.mealVoucherBalance + mealVoucherBalance)
      return json({ card })
    }

    if (method === 'POST' && path === '/api/cashier/redeem') {
      const { rewardId } = body as { rewardId: string }
      const reward = DEMO_REWARDS.find((r) => r.id === rewardId)
      const card = DEMO_CARDS[0]
      if (reward && card.fidelityPoints >= reward.stampsCost) {
        card.fidelityPoints -= reward.stampsCost
      }
      return json({ card, reward })
    }

    if (method === 'GET' && path === '/api/business/dashboard') {
      return json({ dashboard: DEMO_DASHBOARD })
    }

    if (method === 'GET' && path === '/api/business/customers') {
      return json({ customers: [{ ...DEMO_USERS['client@example.com'], fidelityPoints: 7, mealVoucherBalance: 0, lifetimePoints: 15 }], hasMore: false })
    }

    if (method === 'GET' && path === '/api/business/staff') {
      return json({ staff: DEMO_STAFF })
    }

    if (method === 'POST' && path === '/api/business/staff') {
      const { email, role } = body as { email: string; role: string }
      const newStaff = { id: crypto.randomUUID(), userId: crypto.randomUUID(), role: role as 'owner' | 'cashier', createdAt: Date.now(), firstName: email.split('@')[0], lastName: '', email, pointsAwarded: 0, mealAwarded: 0, transactionCount: 0 }
      DEMO_STAFF.push(newStaff)
      return json({ staff: newStaff })
    }

    if (method === 'DELETE' && path.startsWith('/api/business/staff/')) {
      const params = match(path, '/api/business/staff/:userId')
      if (params) { const idx = DEMO_STAFF.findIndex((s) => s.userId === params.userId); if (idx !== -1) DEMO_STAFF.splice(idx, 1) }
      return json({ message: 'ok' })
    }

    if (method === 'GET' && path === '/api/business/rewards') {
      return json({ rewards: DEMO_REWARDS })
    }

    if (method === 'POST' && path === '/api/business/rewards') {
      const { title, description, stampsCost } = body as { title: string; description?: string; stampsCost: number }
      const newReward = { id: crypto.randomUUID(), merchantId: DEMO_MERCHANT.id, title, description: description ?? null, stampsCost, imageUrl: null, isAvailable: true, canRedeem: false, createdAt: Date.now() }
      DEMO_REWARDS.push(newReward)
      return json({ reward: newReward })
    }

    if (path.startsWith('/api/business/rewards/')) {
      const params = match(path, '/api/business/rewards/:id')
      if (params && method === 'PATCH') {
        const r = DEMO_REWARDS.find((r) => r.id === params.id)
        if (r) Object.assign(r, body)
        return json({ reward: r })
      }
      if (params && method === 'DELETE') {
        const idx = DEMO_REWARDS.findIndex((r) => r.id === params.id)
        if (idx !== -1) DEMO_REWARDS.splice(idx, 1)
        return json({ message: 'ok' })
      }
    }

    if (method === 'PATCH' && path === '/api/business/settings') {
      Object.assign(DEMO_MERCHANT, body)
      return json({ merchant: DEMO_MERCHANT })
    }

    if (method === 'GET' && path === '/api/admin/stats') {
      return json({ stats: { users: 4, admins: 1, newUsers24h: 0, rateLimited24h: 0 } })
    }

    if (method === 'GET' && path === '/api/admin/users') {
      return json({ users: Object.values(DEMO_USERS) })
    }

    if (path.startsWith('/api/admin/users/')) {
      const params = match(path, '/api/admin/users/:id')
      if (params && method === 'PATCH') {
        const u = Object.values(DEMO_USERS).find((u) => u.id === params.id)
        if (u) Object.assign(u, body)
        return json({ user: u })
      }
      if (params && method === 'DELETE') {
        const key = Object.keys(DEMO_USERS).find((k) => DEMO_USERS[k]!.id === params.id)
        if (key) delete DEMO_USERS[key]
        return json({ message: 'ok' })
      }
    }

    if (method === 'GET' && path === '/api/admin/rate-limits') {
      return json({ rateLimits: [] })
    }

    if (method === 'GET' && path === '/api/admin/merchants') {
      return json({ merchants: [DEMO_MERCHANT] })
    }

    if (method === 'POST' && path === '/api/admin/merchants') {
      const { name, slug } = body as { name: string; slug: string }
      const newMerchant = { ...DEMO_MERCHANT, id: crypto.randomUUID(), name, slug, createdAt: Date.now(), updatedAt: Date.now() }
      return json({ merchant: newMerchant })
    }

    if (path.startsWith('/api/admin/merchants/')) {
      const params = match(path, '/api/admin/merchants/:id')
      if (params && method === 'DELETE') {
        return json({ message: 'ok' })
      }
      if (params && path.endsWith('/customers') && method === 'GET') {
        return json({ customers: [{ ...DEMO_USERS['client@example.com'], fidelityPoints: 7, mealVoucherBalance: 0, lifetimePoints: 15 }], hasMore: false })
      }
      if (params && path.endsWith('/adjust') && method === 'POST') return json({ message: 'ok' })
      if (params && path.endsWith('/fund') && method === 'POST') return json({ message: 'ok' })
      if (params && path.endsWith('/revoke') && method === 'POST') return json({ message: 'ok' })
    }

    if (method === 'GET' && path === '/api/public/merchants') {
      return json({ merchants: [{ name: DEMO_MERCHANT.name, slug: DEMO_MERCHANT.slug, logoUrl: null }] })
    }

    if (path.startsWith('/api/public/merchant/')) {
      const slug = path.split('/').pop()
      if (slug === DEMO_MERCHANT.slug) return json({ merchant: { name: DEMO_MERCHANT.name, logoUrl: null } })
      return json({ merchant: null }, 404)
    }

    if (path.startsWith('/notifications')) {
      if (method === 'GET' && path === '/notifications/unread') return json({ count: 0 })
      if (method === 'GET') return json({ notifications: [], cursor: null })
      if (method === 'POST' && path.endsWith('/read-all')) return json({ message: 'ok' })
      if (method === 'POST') return json({ message: 'ok' })
    }

    if (path.startsWith('/api/client/push')) {
      return json({ message: 'ok' })
    }

    if (path.startsWith('/api/uploads/')) {
      return json({ url: 'data:image/png;base64,iVBOR' })
    }

    if (method === 'GET' && (path === '/api/client/qr' || path === '/api/client/qr/current')) {
      const totp = String(Math.floor(100000 + Math.random() * 900000))
      return json({ totp, remainingSeconds: 30 - (Math.floor(Date.now() / 1000) % 30), payload: JSON.stringify({ v: 1, u: currentUser?.id, t: totp, ts: Date.now() }) })
    }

    return originalFetch(input, init)
  }
}
