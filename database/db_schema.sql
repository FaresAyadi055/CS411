-- ============================================================
--  AppBase — SQLite Schema
--  Rewritten to match backend/src/db/schema.ts exactly
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
--  AUTH TABLES  (Better Auth)
-- ============================================================

-- Store user credentials & secret
CREATE TABLE IF NOT EXISTS "auth_users" (
    "id"             TEXT    PRIMARY KEY,
    "name"           TEXT    NOT NULL,
    "email"          TEXT    NOT NULL UNIQUE,
    "email_verified" INTEGER NOT NULL DEFAULT 0,
    "image"          TEXT,
    "totp_secret"    TEXT,            -- Base32 secret key for TOTP dynamic QR (clients only)
    "created_at"     INTEGER NOT NULL,
    "updated_at"     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "auth_users_email_idx" ON "auth_users" ("email");

CREATE TABLE IF NOT EXISTS "session" (
    "id"         TEXT    PRIMARY KEY,
    "expires_at" INTEGER NOT NULL,
    "token"      TEXT    NOT NULL UNIQUE,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id"    TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "role"       TEXT    DEFAULT 'user'
);

CREATE INDEX IF NOT EXISTS "session_user_idx"  ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session" ("token");

CREATE TABLE IF NOT EXISTS "account" (
    "id"                       TEXT    PRIMARY KEY,
    "account_id"               TEXT    NOT NULL,
    "provider_id"              TEXT    NOT NULL,
    "user_id"                  TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "access_token"             TEXT,
    "refresh_token"            TEXT,
    "id_token"                 TEXT,
    "access_token_expires_at"  INTEGER,
    "refresh_token_expires_at" INTEGER,
    "scope"                    TEXT,
    "password"                 TEXT,
    "created_at"               INTEGER NOT NULL,
    "updated_at"               INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "account_user_idx" ON "account" ("user_id");

CREATE TABLE IF NOT EXISTS "verification" (
    "id"         TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "expires_at" INTEGER NOT NULL,
    "created_at" INTEGER,
    "updated_at" INTEGER
);

CREATE TABLE IF NOT EXISTS "jwks" (
    "id"          TEXT PRIMARY KEY,
    "key_id"      TEXT,
    "public_key"  TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "created_at"  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "apikey" (
    "id"                   TEXT    PRIMARY KEY,
    "config_id"            TEXT    NOT NULL,
    "name"                 TEXT,
    "start"                TEXT,
    "reference_id"         TEXT    NOT NULL,
    "prefix"               TEXT,
    "key"                  TEXT    NOT NULL,
    "refill_interval"      INTEGER,
    "refill_amount"        INTEGER,
    "last_refill_at"       INTEGER,
    "enabled"              INTEGER NOT NULL DEFAULT 1,
    "rate_limit_enabled"   INTEGER NOT NULL DEFAULT 1,
    "rate_limit_time_window" INTEGER,
    "rate_limit_max"       INTEGER,
    "request_count"        INTEGER NOT NULL DEFAULT 0,
    "remaining"            INTEGER,
    "last_request"         INTEGER,
    "expires_at"           INTEGER,
    "created_at"           INTEGER NOT NULL,
    "updated_at"           INTEGER NOT NULL,
    "permissions"          TEXT,
    "metadata"             TEXT
);

CREATE INDEX IF NOT EXISTS "apikey_ref_idx" ON "apikey" ("reference_id");
CREATE INDEX IF NOT EXISTS "apikey_key_idx" ON "apikey" ("key");

-- ============================================================
--  APP TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "user" (
    "id"           TEXT    PRIMARY KEY REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "role"         TEXT    NOT NULL DEFAULT 'user',
    "first_name"   TEXT,
    "last_name"    TEXT,
    "email"        TEXT    NOT NULL UNIQUE,
    "address"      TEXT,
    "locale"       TEXT    DEFAULT 'en',
    "notifications_enabled" INTEGER NOT NULL DEFAULT 1,
    "created_at"   TEXT,
    "last_updated" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user" ("role");

CREATE TABLE IF NOT EXISTS "rate_limit_log" (
    "id"           TEXT    PRIMARY KEY,
    "ip_address"   TEXT    NOT NULL,
    "reason"       TEXT    NOT NULL,
    "triggered_at" TEXT,
    "is_resolved"  INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "rate_limit_ip_idx" ON "rate_limit_log" ("ip_address");

-- ============================================================
--  LOYALTY PLATFORM DOMAIN TABLES
-- ============================================================

-- 1. MERCHANT / STORE PROFILES
CREATE TABLE IF NOT EXISTS "merchants" (
    "id"                TEXT    PRIMARY KEY,
    "owner_id"          TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "name"              TEXT    NOT NULL,
    "slug"              TEXT    NOT NULL UNIQUE,
    "logo_url"          TEXT,
    "lat"               REAL,
    "lng"               REAL,
    "address"           TEXT,
    "stamps_per_reward" INTEGER NOT NULL DEFAULT 10,
    "plan_tier"         TEXT    NOT NULL DEFAULT 'starter', -- 'starter', 'growth', 'pro'
    "monthly_point_cap" INTEGER NOT NULL DEFAULT 300,
    "points_used_month" INTEGER NOT NULL DEFAULT 0,
    "secret_hmac_key"   TEXT    NOT NULL, -- Used to sign/verify dynamic client QR tokens
    "is_active"         INTEGER NOT NULL DEFAULT 1,
    "created_at"        INTEGER NOT NULL,
    "updated_at"        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "merchants_owner_idx" ON "merchants" ("owner_id");
CREATE UNIQUE INDEX IF NOT EXISTS "merchants_slug_idx"  ON "merchants" ("slug");

-- 2. CASHIER / STAFF ACCOUNTS (For Scanning Counter QR Codes)
CREATE TABLE IF NOT EXISTS "merchant_staff" (
    "id"          TEXT    PRIMARY KEY,
    "merchant_id" TEXT    NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
    "user_id"     TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "role"        TEXT    NOT NULL DEFAULT 'cashier', -- 'owner', 'manager', 'cashier'
    "created_at"  INTEGER NOT NULL,
    UNIQUE("merchant_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "staff_merchant_idx" ON "merchant_staff" ("merchant_id");

-- 3. CUSTOMER BALANCES (Fidelity Points + Meal Voucher per Merchant)
CREATE TABLE IF NOT EXISTS "customer_cards" (
    "id"                      TEXT    PRIMARY KEY,
    "customer_id"             TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "merchant_id"             TEXT    NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
    "fidelity_points"         INTEGER NOT NULL DEFAULT 0,
    "meal_voucher_balance"    REAL    NOT NULL DEFAULT 0,
    "lifetime_points"         INTEGER NOT NULL DEFAULT 0,
    "meal_voucher_total"      REAL    NOT NULL DEFAULT 0,
    "last_visit_at"           INTEGER,
    "created_at"              INTEGER NOT NULL,
    "updated_at"              INTEGER NOT NULL,
    UNIQUE("customer_id", "merchant_id")
);

CREATE INDEX IF NOT EXISTS "card_customer_idx" ON "customer_cards" ("customer_id");
CREATE INDEX IF NOT EXISTS "card_merchant_idx" ON "customer_cards" ("merchant_id");

-- 4. AVAILABLE REWARDS CATALOG
CREATE TABLE IF NOT EXISTS "rewards" (
   "id"            TEXT    PRIMARY KEY,
   "merchant_id"   TEXT    NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
   "title"         TEXT    NOT NULL, -- e.g. "Free Cappuccino"
   "description"   TEXT,
   "stamps_cost"   INTEGER NOT NULL DEFAULT 10,
   "image_url"     TEXT,
   "is_available"  INTEGER NOT NULL DEFAULT 1,
   "created_at"    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "rewards_merchant_idx" ON "rewards" ("merchant_id");

-- 5. AUDIT LOG TRANSACTIONS (Points & Meal Voucher)
CREATE TABLE IF NOT EXISTS "stamp_transactions" (
    "id"            TEXT    PRIMARY KEY,
    "merchant_id"   TEXT    NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
    "customer_id"   TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "cashier_id"    TEXT    NOT NULL REFERENCES "auth_users"("id"),
    "type"          TEXT    NOT NULL, -- 'ADD_POINTS', 'REMOVE_POINTS', 'ADD_MEAL_VOUCHER', 'REMOVE_MEAL_VOUCHER'
    "balance_type"  TEXT    NOT NULL, -- 'fidelity' or 'meal_voucher'
    "reward_id"     TEXT    REFERENCES "rewards"("id") ON DELETE SET NULL,
    "amount"        REAL    NOT NULL DEFAULT 0,
    "created_at"    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "tx_merchant_idx" ON "stamp_transactions" ("merchant_id");
CREATE INDEX IF NOT EXISTS "tx_customer_idx" ON "stamp_transactions" ("customer_id");
CREATE INDEX IF NOT EXISTS "tx_merchant_created_idx" ON "stamp_transactions" ("merchant_id", "created_at");

-- 6. ANTI-FRAUD / REPLAY LOCK (Prevents Screenshot QR Reuse)
CREATE TABLE IF NOT EXISTS "used_qr_signatures" (
    "signature"  TEXT    PRIMARY KEY, -- The HMAC signature from the dynamic QR payload
    "user_id"    TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "scanned_at" INTEGER NOT NULL,
    "expires_at" INTEGER NOT NULL  -- Used for automated cleanup tasks
);

CREATE INDEX IF NOT EXISTS "used_qr_exp_idx" ON "used_qr_signatures" ("expires_at");

-- 7. MERCHANT SUBSCRIPTIONS (auto-created when a customer earns a point)
CREATE TABLE IF NOT EXISTS "merchant_subscriptions" (
    "id"          TEXT    PRIMARY KEY,
    "user_id"     TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "merchant_id" TEXT    NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
    "created_at"  INTEGER NOT NULL,
    UNIQUE("user_id", "merchant_id")
);

CREATE INDEX IF NOT EXISTS "sub_user_idx" ON "merchant_subscriptions" ("user_id");

-- 8. NOTIFICATIONS (in-app; one per relevant event)
CREATE TABLE IF NOT EXISTS "notifications" (
    "id"          TEXT    PRIMARY KEY,
    "user_id"     TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "merchant_id" TEXT    REFERENCES "merchants"("id") ON DELETE CASCADE,
    "type"        TEXT    NOT NULL,
    "data"        TEXT,
    "is_read"     INTEGER NOT NULL DEFAULT 0,
    "created_at"  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "notif_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notif_user_created_idx" ON "notifications" ("user_id", "created_at");

-- 9. WEB PUSH SUBSCRIPTIONS (per-device; used by future server-side push delivery)
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id"          TEXT    PRIMARY KEY,
    "user_id"     TEXT    NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
    "endpoint"    TEXT    NOT NULL,
    "p256dh"      TEXT    NOT NULL,
    "auth"        TEXT    NOT NULL,
    "created_at"  INTEGER NOT NULL,
    UNIQUE("endpoint")
);

CREATE INDEX IF NOT EXISTS "push_user_idx" ON "push_subscriptions" ("user_id");