import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { env } from '../config/env'
import * as schema from './schema'

function createDb() {
  // Local SQLite file (libSQL client)
  const client = createClient({ url: env.localDbPath })
  client.execute('PRAGMA journal_mode=WAL')
  client.execute('PRAGMA busy_timeout=5000')
  return drizzle(client, { schema })
}

let _db: ReturnType<typeof drizzle>

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!_db) _db = createDb()
    return Reflect.get(_db, prop, _db)
  }
})
export type Db = ReturnType<typeof drizzle>
