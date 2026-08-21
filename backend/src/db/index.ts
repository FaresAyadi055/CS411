import { createClient } from '@libsql/client'
import { createClient as createWebClient } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import { env } from '../config/env'
import * as schema from './schema'

function createDb() {
  // Remote Turso — use the web client on both Node and Workers
  // (web client uses fetch()/WebSocket which is stable on both platforms;
  //  the Node client has connect-timeout issues with Turso on Windows)
  // Set USE_LOCAL_DB=true to skip Turso and use local SQLite for local dev
  if (!env.useLocalDb && env.tursoUrl && env.tursoToken) {
    const client = createWebClient({ url: env.tursoUrl, authToken: env.tursoToken })
    return drizzle(client, { schema })
  }

  // Local SQLite — use the Node client
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
