import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

// --- Better Auth (table: auth_users mapped as `user` in adapter) ---
export const authUsers = sqliteTable('auth_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
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
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull().unique(),
  address: text('address'),
  locale: text('locale').default('en'),
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

/** Schema object passed to Better Auth drizzle adapter */
export const authSchema = {
  user: authUsers,
  session,
  account,
  verification,
  jwks,
  apikey,
}