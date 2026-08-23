import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
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

/** App profile joined to a Better Auth user. Role lives here and is mirrored onto sessions. */
export const user = sqliteTable('user', {
  id: text('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['client', 'cashier', 'business', 'admin'] }).notNull().default('client'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull().unique(),
  address: text('address'),
  locale: text('locale').default('en'),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  lastUpdated: text('last_updated').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  emailIdx: uniqueIndex('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
}))

/** Per-IP request logging used by the HTTP rate limiter. */
export const rateLimitLog = sqliteTable('rate_limit_log', {
  id: text('id').primaryKey(),
  ipAddress: text('ip_address').notNull(),
  reason: text('reason').notNull(),
  triggeredAt: text('triggered_at').$defaultFn(() => new Date().toISOString()),
  isResolved: integer('is_resolved').default(0),
}, (table) => ({
  ipIdx: index('rate_limit_ip_idx').on(table.ipAddress),
}))

export const apikey = sqliteTable('apikey', {
  id: text('id').primaryKey(),
  configId: text('config_id').notNull(),
  name: text('name'),
  start: text('start'),
  referenceId: text('reference_id').notNull(),
  prefix: text('prefix'),
  key: text('key').notNull(),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  lastRefillAt: integer('last_refill_at', { mode: 'timestamp_ms' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  rateLimitEnabled: integer('rate_limit_enabled', { mode: 'boolean' }).notNull().default(true),
  rateLimitTimeWindow: integer('rate_limit_time_window'),
  rateLimitMax: integer('rate_limit_max'),
  requestCount: integer('request_count').notNull().default(0),
  remaining: integer('remaining'),
  lastRequest: integer('last_request', { mode: 'timestamp_ms' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  permissions: text('permissions'),
  metadata: text('metadata'),
}, (table) => ({
  refIdx: index('apikey_ref_idx').on(table.referenceId),
  keyIdx: index('apikey_key_idx').on(table.key),
}))

// --- Loyalty Platform Tables ---

export const merchants = sqliteTable('merchants', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  lat: real('lat'),
  lng: real('lng'),
  address: text('address'),
  stampsPerReward: integer('stamps_per_reward').notNull().default(10),
  planTier: text('plan_tier').notNull().default('starter'),
  monthlyPointCap: integer('monthly_point_cap').notNull().default(300),
  pointsUsedMonth: integer('points_used_month').notNull().default(0),
  secretHmacKey: text('secret_hmac_key').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  ownerIdx: index('merchants_owner_idx').on(table.ownerId),
  slugIdx: uniqueIndex('merchants_slug_idx').on(table.slug),
}))

export const merchantStaff = sqliteTable('merchant_staff', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('cashier'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  merchantIdx: index('staff_merchant_idx').on(table.merchantId),
  userIdx: index('staff_user_idx').on(table.userId),
}))

export const customerCards = sqliteTable('customer_cards', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  fidelityPoints: integer('fidelity_points').notNull().default(0),
  mealVoucherBalance: real('meal_voucher_balance').notNull().default(0),
  lifetimePoints: integer('lifetime_points').notNull().default(0),
  mealVoucherTotal: real('meal_voucher_total').notNull().default(0),
  lastVisitAt: integer('last_visit_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  customerIdx: index('card_customer_idx').on(table.customerId),
  merchantIdx: index('card_merchant_idx').on(table.merchantId),
  customerMerchantUnq: uniqueIndex('card_customer_merchant_unq').on(table.customerId, table.merchantId),
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
  cashierId: text('cashier_id').notNull().references(() => authUsers.id),
  type: text('type').notNull(), // 'ADD_POINTS', 'REMOVE_POINTS', 'ADD_MEAL_VOUCHER', 'REMOVE_MEAL_VOUCHER'
  balanceType: text('balance_type').notNull(), // 'fidelity' or 'meal_voucher'
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

/** A customer is auto-subscribed to a merchant the first time they earn a point there. */
export const merchantSubscriptions = sqliteTable('merchant_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userMerchantUnq: uniqueIndex('sub_user_merchant_unq').on(table.userId, table.merchantId),
}))

/** In-app notifications, one per relevant event (e.g. a loyalty transaction). */
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: text('data'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('notif_user_idx').on(table.userId),
  userCreatedIdx: index('notif_user_created_idx').on(table.userId, table.createdAt),
}))

/** Web Push subscriptions for a user's devices (used by future server-side push delivery). */
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  endpointUnq: uniqueIndex('push_endpoint_unq').on(table.endpoint),
  userIdx: index('push_user_idx').on(table.userId),
}))

/** Schema object passed to Better Auth drizzle adapter */
export const authSchema = {
  user: authUsers,
  session,
  account,
  verification,
  jwks,
  apikey,
}