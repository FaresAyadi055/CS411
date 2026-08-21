import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { randomUUID } from 'node:crypto'
import * as schema from './schema'
import { hashPassword } from '../lib/auth-password'
// cd backend; npx tsx src/db/seed.ts 2>&1 to execute

async function main() {
  const tursoUrl = process.env.TURSO_SQLITE_DATABASE_URL
  const tursoToken = process.env.TURSO_TOKEN
  const localDbPath = process.env.LOCAL_DB_PATH ?? 'file:../database/app.db'

  let client: ReturnType<typeof createClient>
  if (tursoUrl && tursoToken) {
    client = createClient({ url: tursoUrl, authToken: tursoToken })
  } else {
    client = createClient({ url: localDbPath })
  }

  const db = drizzle(client, { schema })

  const authUserId = randomUUID()
  const now = new Date()

  console.log('Seeding database...')

  await db.insert(schema.authUsers).values({
    id: authUserId,
    name: 'Admin User',
    email: 'admin@example.com',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.account).values({
    id: randomUUID(),
    accountId: authUserId,
    providerId: 'credential',
    userId: authUserId,
    password: await hashPassword('password123'),
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.user).values({
    id: authUserId,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    locale: 'en',
  })

  console.log('Seeded admin admin@example.com / password: password123')
  console.log('Done!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})