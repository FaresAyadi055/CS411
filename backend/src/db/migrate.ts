import { createClient } from '@libsql/client'

const CREATE = [
  `CREATE TABLE IF NOT EXISTS jwks (
    id TEXT PRIMARY KEY,
    key_id TEXT,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    email_verified INTEGER DEFAULT 0,
    name TEXT,
    image TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth_users (email)`,
  `CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'user'
  )`,
  `CREATE INDEX IF NOT EXISTS session_user_idx ON session (user_id)`,
  `CREATE INDEX IF NOT EXISTS session_token_idx ON session (token)`,
  `CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS account_user_idx ON account (user_id)`,
  `CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    address TEXT,
    locale TEXT DEFAULT 'en',
    created_at TEXT DEFAULT (datetime('now')),
    last_updated TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON "user" (email)`,
  `CREATE INDEX IF NOT EXISTS user_role_idx ON "user" (role)`,
  `CREATE TABLE IF NOT EXISTS rate_limit_log (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    reason TEXT NOT NULL,
    triggered_at TEXT DEFAULT (datetime('now')),
    is_resolved INTEGER DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS rate_limit_ip_idx ON rate_limit_log (ip_address)`,
  `CREATE TABLE IF NOT EXISTS apikey (
    id TEXT PRIMARY KEY,
    config_id TEXT NOT NULL,
    name TEXT,
    start TEXT,
    reference_id TEXT NOT NULL,
    prefix TEXT,
    key TEXT NOT NULL,
    refill_interval INTEGER,
    refill_amount INTEGER,
    last_refill_at INTEGER,
    enabled INTEGER NOT NULL DEFAULT 1,
    rate_limit_enabled INTEGER NOT NULL DEFAULT 1,
    rate_limit_time_window INTEGER,
    rate_limit_max INTEGER,
    request_count INTEGER NOT NULL DEFAULT 0,
    remaining INTEGER,
    last_request INTEGER,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    permissions TEXT,
    metadata TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS apikey_ref_idx ON apikey (reference_id)`,
  `CREATE INDEX IF NOT EXISTS apikey_key_idx ON apikey (key)`,
]

async function runSafe(sql: string, label: string, c: ReturnType<typeof createClient>) {
  try {
    await c.execute(sql)
    console.log('OK:', label)
  } catch (e) {
    const msg = String(e)
    if (msg.includes('no such column') || msg.includes('duplicate column') || msg.includes('duplicate table') || msg.includes('no such table') || msg.includes('already exists')) {
      console.log('Skip (exists):', label)
    } else {
      throw e
    }
  }
}

async function main() {
  let client: ReturnType<typeof createClient>

  const tursoUrl = process.env.TURSO_SQLITE_DATABASE_URL
  const tursoToken = process.env.TURSO_TOKEN
  const localDbPath = process.env.LOCAL_DB_PATH ?? 'file:../database/app.db'

  if (tursoUrl && tursoToken) {
    client = createClient({ url: tursoUrl, authToken: tursoToken })
  } else {
    client = createClient({ url: localDbPath })
  }

  console.log('Creating tables...')
  for (const sql of CREATE) {
    await runSafe(sql, sql.slice(0, 70), client)
  }

  console.log('Migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})