import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// --- Better Auth (table: auth_users mapped as `user` in adapter) ---
export const authUsers = sqliteTable('auth_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  totpSecret: text('totp_secret'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => ({
  emailIdx: index('auth_users_email_idx').on(table.email),
}))

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  role: text('role').default('user'),
}, (table) => ({
  userIdx: index('session_user_idx').on(table.userId),
  tokenIdx: index('session_token_idx').on(table.token),
}))

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('account_user_idx').on(table.userId),
}))

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
})

export const jwks = sqliteTable('jwks', {
  id: text('id').primaryKey(),
  keyId: text('key_id'),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const user = sqliteTable('user', {
  id: text('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['client', 'business', 'admin'] }).notNull().default('client'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  email: text('email').notNull().unique(),
  address: text('address'),
  locale: text('locale').default('en'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  lastUpdated: text('last_updated').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  emailIdx: uniqueIndex('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
}))

export const rateLimitLog = sqliteTable('rate_limit_log', {
  id: text('id').primaryKey(),
  ipAddress: text('ip_address').notNull(),
  reason: text('reason').notNull(),
  triggeredAt: text('triggered_at').$defaultFn(() => new Date().toISOString()),
  isResolved: integer('is_resolved', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  ipAddressIdx: index('rl_ip_idx').on(table.ipAddress),
  triggeredAtIdx: index('rl_triggered_at_idx').on(table.triggeredAt),
}))

// --- Loyalty Platform Tables ---

export const merchants = sqliteTable('merchants', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  stampsPerReward: integer('stamps_per_reward').notNull().default(10),
  planTier: text('plan_tier', { enum: ['starter', 'growth', 'pro'] }).notNull().default('starter'),
  pointsBalance: integer('points_balance').notNull().default(0),
  pointsFunded: integer('points_funded').notNull().default(0),
  secretHmacKey: text('secret_hmac_key').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  ownerIdx: index('merchants_owner_idx').on(table.ownerId),
  slugIdx: uniqueIndex('merchants_slug_idx').on(table.slug),
}))

// Public merchant projection — intentionally excludes `secretHmacKey` (anti-replay signing
// secret). Use this for every merchant read that is returned to a client; selecting the full
// row leaks the HMAC secret (see admin/business merchant routes).
export const merchantPublic = {
  id: merchants.id,
  ownerId: merchants.ownerId,
  name: merchants.name,
  slug: merchants.slug,
  logoUrl: merchants.logoUrl,
  stampsPerReward: merchants.stampsPerReward,
  planTier: merchants.planTier,
  pointsBalance: merchants.pointsBalance,
  pointsFunded: merchants.pointsFunded,
  isActive: merchants.isActive,
  createdAt: merchants.createdAt,
  updatedAt: merchants.updatedAt,
} as const

export const merchantStaff = sqliteTable('merchant_staff', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('business'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  merchantIdx: index('staff_merchant_idx').on(table.merchantId),
  userIdx: index('staff_user_idx').on(table.userId),
}))

export const customerCards = sqliteTable('customer_cards', {
  // NOTE: customerId is ON DELETE CASCADE — deleting a user currently erases all their
  // stamp transactions and card balances (financial/audit history) across every merchant.
  // Admin user-deletion is guarded at the app layer (routes/admin.ts) to prevent this until a
  // product decision is made (soft-delete/anonymize vs. hard delete).
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  fidelityPoints: integer('fidelity_points').notNull().default(0),
  lifetimePoints: integer('lifetime_points').notNull().default(0),
  lastVisitAt: integer('last_visit_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  customerIdx: index('card_customer_idx').on(table.customerId),
  merchantIdx: index('card_merchant_idx').on(table.merchantId),
  customerMerchantUnq: uniqueIndex('card_customer_merchant_unq').on(table.customerId, table.merchantId),
  chkFidelity: check('chk_fidelity_points', sql`${table.fidelityPoints} >= 0`),
  chkLifetime: check('chk_lifetime_points', sql`${table.lifetimePoints} >= 0`),
}))

export const rewards = sqliteTable('rewards', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  stampsCost: integer('stamps_cost').notNull().default(10),
  imageUrl: text('image_url'),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  merchantIdx: index('rewards_merchant_idx').on(table.merchantId),
}))

export const stampTransactions = sqliteTable('stamp_transactions', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  cashierId: text('cashier_id').notNull().references(() => authUsers.id, { onDelete: 'restrict' }),
  type: text('type', { enum: ['ADD_POINTS', 'REMOVE_POINTS'] }).notNull(),
  balanceType: text('balance_type', { enum: ['fidelity'] }).notNull().default('fidelity'),
  rewardId: text('reward_id').references(() => rewards.id, { onDelete: 'set null' }),
  amount: real('amount').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  merchantIdx: index('tx_merchant_idx').on(table.merchantId),
  customerIdx: index('tx_customer_idx').on(table.customerId),
  cashierIdx: index('tx_cashier_idx').on(table.cashierId),
  merchantCreatedIdx: index('tx_merchant_created_idx').on(table.merchantId, table.createdAt),
}))

export const usedQrSignatures = sqliteTable('used_qr_signatures', {
  signature: text('signature').primaryKey(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  scannedAt: integer('scanned_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
  expiresIdx: index('used_qr_exp_idx').on(table.expiresAt),
}))

export const merchantSubscriptions = sqliteTable('merchant_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('msub_user_idx').on(table.userId),
  merchantIdx: index('msub_merchant_idx').on(table.merchantId),
  userMerchantUnq: uniqueIndex('msub_user_merchant_unq').on(table.userId, table.merchantId),
}))

// --- Loyalty Platform Tables ---
// (notifications, pushSubscriptions tables removed for demo)

/** Schema object passed to Better Auth drizzle adapter */
export const authSchema = {
  user: authUsers,
  session,
  account,
  verification,
  jwks,
}
