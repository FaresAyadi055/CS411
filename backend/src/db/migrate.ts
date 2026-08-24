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
    totp_secret TEXT,
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
    role TEXT DEFAULT 'client'
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
    role TEXT NOT NULL DEFAULT 'client',
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
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
  `CREATE INDEX IF NOT EXISTS rate_limit_triggered_idx ON rate_limit_log (triggered_at)`,
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
  // --- Loyalty Platform Tables ---
  `CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    stamps_per_reward INTEGER NOT NULL DEFAULT 10,
    plan_tier TEXT NOT NULL DEFAULT 'starter',
    points_balance INTEGER NOT NULL DEFAULT 0,
    points_funded INTEGER NOT NULL DEFAULT 0,
    secret_hmac_key TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS merchants_owner_idx ON merchants (owner_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS merchants_slug_idx ON merchants (slug)`,
  `CREATE TABLE IF NOT EXISTS merchant_staff (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'cashier',
    created_at INTEGER NOT NULL,
    UNIQUE(merchant_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS staff_merchant_idx ON merchant_staff (merchant_id)`,
  `CREATE INDEX IF NOT EXISTS staff_user_idx ON merchant_staff (user_id)`,
  `CREATE TABLE IF NOT EXISTS customer_cards (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    current_stamps INTEGER NOT NULL DEFAULT 0,
    lifetime_stamps INTEGER NOT NULL DEFAULT 0,
    rewards_redeemed INTEGER NOT NULL DEFAULT 0,
    last_visit_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(customer_id, merchant_id)
  )`,
  `CREATE INDEX IF NOT EXISTS card_customer_idx ON customer_cards (customer_id)`,
  `CREATE INDEX IF NOT EXISTS card_merchant_idx ON customer_cards (merchant_id)`,
  `CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    stamps_cost INTEGER NOT NULL DEFAULT 10,
    image_url TEXT,
    is_available INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS rewards_merchant_idx ON rewards (merchant_id)`,
  `CREATE TABLE IF NOT EXISTS stamp_transactions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    cashier_id TEXT NOT NULL REFERENCES auth_users(id),
    type TEXT NOT NULL,
    stamps_count INTEGER NOT NULL DEFAULT 1,
    reward_id TEXT REFERENCES rewards(id),
    is_offline_sync INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS tx_merchant_idx ON stamp_transactions (merchant_id)`,
  `CREATE INDEX IF NOT EXISTS tx_customer_idx ON stamp_transactions (customer_id)`,
  `CREATE INDEX IF NOT EXISTS tx_cashier_idx ON stamp_transactions (cashier_id)`,
  `CREATE INDEX IF NOT EXISTS tx_merchant_created_idx ON stamp_transactions (merchant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS used_qr_signatures (
    signature TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    scanned_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS used_qr_exp_idx ON used_qr_signatures (expires_at)`,
  `CREATE TABLE IF NOT EXISTS merchant_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, merchant_id)
  )`,
  `CREATE INDEX IF NOT EXISTS sub_user_idx ON merchant_subscriptions (user_id)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    merchant_id TEXT REFERENCES merchants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications (user_id)`,
  `CREATE INDEX IF NOT EXISTS notif_user_created_idx ON notifications (user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(endpoint)
  )`,
  `CREATE INDEX IF NOT EXISTS push_user_idx ON push_subscriptions (user_id)`,
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

const ALTERS = [
  `ALTER TABLE auth_users ADD COLUMN totp_secret TEXT`,
  `ALTER TABLE "user" ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "user" ADD COLUMN phone TEXT`,
  `ALTER TABLE merchants RENAME COLUMN monthly_point_cap TO points_balance`,
  `ALTER TABLE merchants RENAME COLUMN points_used_month TO points_funded`,
]

async function main() {
  let client: ReturnType<typeof createClient>

  const localDbPath = process.env.LOCAL_DB_PATH ?? 'file:../database/app.db'
  client = createClient({ url: localDbPath })
  client.execute('PRAGMA journal_mode=WAL')
  client.execute('PRAGMA busy_timeout=5000')

  console.log('Creating tables...')
  for (const sql of CREATE) {
    await runSafe(sql, sql.slice(0, 70), client)
  }

  console.log('Running ALTERs...')
  for (const sql of ALTERS) {
    await runSafe(sql, sql.slice(0, 70), client)
  }

  console.log('Migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})