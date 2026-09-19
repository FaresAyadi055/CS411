import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { randomUUID } from 'node:crypto'
import * as schema from './schema'
import { hashPassword } from '../lib/auth-password'
import { generateSecret } from '../services/totp'
import { randomBytes } from 'node:crypto'

async function main() {
  const localDbPath = process.env.LOCAL_DB_PATH ?? 'file:../database/app.db'

  const client = createClient({ url: localDbPath })
  client.execute('PRAGMA journal_mode=WAL')
  client.execute('PRAGMA busy_timeout=5000')

  const db = drizzle(client, { schema })
  const now = new Date()

  console.log('Clearing existing data...')

  await db.delete(schema.usedQrSignatures)
  await db.delete(schema.stampTransactions)
  await db.delete(schema.customerCards)
  await db.delete(schema.rewards)
  await db.delete(schema.merchantStaff)
  await db.delete(schema.merchants)
  await db.delete(schema.session)
  await db.delete(schema.account)
  await db.delete(schema.user)
  await db.delete(schema.authUsers)

  console.log('Seeding database...')

  const users = [
    { id: randomUUID(), name: 'Admin User', email: 'admin@example.com', role: 'admin' as const, firstName: 'Admin', lastName: 'User' },
    { id: randomUUID(), name: 'Business Owner', email: 'business@example.com', role: 'business' as const, firstName: 'Samir', lastName: 'Trabelsi' },
    { id: randomUUID(), name: 'Client User', email: 'client@example.com', role: 'client' as const, firstName: 'Ahmed', lastName: 'Mansour' },
  ]

  for (const u of users) {
    await db.insert(schema.authUsers).values({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      totpSecret: generateSecret(),
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(schema.account).values({
      id: randomUUID(),
      accountId: u.id,
      providerId: 'credential',
      userId: u.id,
      password: await hashPassword('password123'),
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(schema.user).values({
      id: u.id,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      locale: 'en',
    })
  }

  const businessUser = users[1]

  const merchantId = randomUUID()
  await db.insert(schema.merchants).values({
    id: merchantId,
    ownerId: businessUser.id,
    name: 'Café Bonjour',
    slug: 'cafe-bonjour',
    stampsPerReward: 10,
    planTier: 'growth',
    pointsBalance: 0,
    pointsFunded: 0,
    isActive: true,
    secretHmacKey: randomBytes(32).toString('hex'),
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.merchantStaff).values({
    id: randomUUID(),
    merchantId,
    userId: businessUser.id,
    role: 'owner',
    createdAt: now,
  })

  await db.insert(schema.rewards).values({
    id: randomUUID(),
    merchantId,
    title: 'Free Coffee',
    description: 'Any small coffee on the house',
    stampsCost: 10,
    isAvailable: true,
    createdAt: now,
  })

  await db.insert(schema.rewards).values({
    id: randomUUID(),
    merchantId,
    title: 'Free Pastry',
    description: 'Choice of croissant or muffin',
    stampsCost: 20,
    isAvailable: true,
    createdAt: now,
  })

  const clientUser = users[2]

  await db.insert(schema.merchantSubscriptions).values({
    id: randomUUID(),
    userId: clientUser.id,
    merchantId,
    createdAt: now,
  })

  await db.insert(schema.customerCards).values({
    id: randomUUID(),
    customerId: clientUser.id,
    merchantId,
    fidelityPoints: 7,
    lifetimePoints: 15,
    lastVisitAt: new Date(now.getTime() - 2 * 86400000),
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.stampTransactions).values(
    [
      { id: randomUUID(), merchantId, customerId: clientUser.id, cashierId: businessUser.id, type: 'ADD_POINTS', balanceType: 'fidelity', amount: 8, createdAt: new Date(now.getTime() - 5 * 86400000) },
      { id: randomUUID(), merchantId, customerId: clientUser.id, cashierId: businessUser.id, type: 'ADD_POINTS', balanceType: 'fidelity', amount: 7, createdAt: new Date(now.getTime() - 2 * 86400000) },
      { id: randomUUID(), merchantId, customerId: clientUser.id, cashierId: businessUser.id, type: 'REMOVE_POINTS', balanceType: 'fidelity', rewardId: null, amount: 8, createdAt: new Date(now.getTime() - 1 * 86400000) },
    ],
  )

  console.log('Seeded:')
  console.log('  admin    admin@example.com    / password123')
  console.log('  business business@example.com / password123')
  console.log('  client   client@example.com   / password123')
  console.log('  merchant "Café Bonjour" (cafe-bonjour) with 2 rewards')
  console.log('  client card: 7/10 fidelity points, 15 lifetime, 3 transactions')
  console.log('Done!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
