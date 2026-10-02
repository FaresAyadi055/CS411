# Fidelito

Digital loyalty card PWA for Tunisian businesses. Customers get dynamic TOTP QR codes that refresh every 30 seconds; cashiers scan to stamp loyalty cards. Businesses manage staff, rewards, and analytics.

## Domain

Fidelito.tn — a digital loyalty card platform for small to medium Tunisian businesses. Each business (merchant) has isolated loyalty cards. The code works across any partner, but loyalty data is per-merchant.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Hono + Drizzle ORM + Better Auth |
| Database | SQLite (local file) with libSQL client |
| Auth | Better Auth (email/password, bearer tokens, Google/Facebook OAuth, email OTP) |
| QR/TOTP | RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30s period) — hand-rolled with Web Crypto |
| Frontend | Svelte 5 (runes mode, CSR) + Vite 8 |
| Styling | Tailwind CSS v4 |
| Icons | @lucide/svelte |
| Email | Resend (OTP verification/reset) |
| Package | pnpm monorepo |

## Project Structure

```
├── app/
│   ├── backend/                    # Hono API server
│   │   ├── src/
│   │   │   ├── db/                 # Schema, manual migrations, seed
│   │   │   ├── routes/             # API handlers (otp, me, admin, client, cashier, business)
│   │   │   ├── services/           # Business logic (otp, totp, stamp, analytics)
│   │   │   ├── middleware/         # Auth, rate limiting, role checks, security headers
│   │   │   ├── config/             # Env configuration
│   │   │   └── lib/                # Shared utilities (password hashing, errors)
│   │   └── .env
│   └── frontend/                   # Svelte SPA
├── database/                       # SQLite DB + schema SQL
└── pnpm-workspace.yaml
```

## Roles

| Role | Description |
|------|-------------|
| `client` | Default role. Shows dynamic QR, views own stamps and cards. |
| `cashier` | Scans client QR codes to stamp loyalty cards. Assigned per-merchant via `merchant_staff`. |
| `business` | Merchant owner. Has dashboard, manages staff, rewards, analytics. Also acts as cashier. |
| `admin` | Platform admin. Manages merchants, users, platform-wide stats. |

## Domain Model

| Table | Purpose |
|-------|---------|
| `merchants` | Business profiles (owner, name, slug, stamps_per_reward, plan_tier, points_balance, points_funded, secret_hmac_key) |
| `merchant_staff` | Links users to merchants (role: owner/cashier). Unique on (merchant_id, user_id) |
| `customer_cards` | Per-customer fidelity point balance per merchant. Unique on (customer_id, merchant_id) |
| `rewards` | Available rewards catalog per merchant |
| `stamp_transactions` | Audit log: ADD_POINTS / REMOVE_POINTS transactions |
| `used_qr_signatures` | Anti-replay lock. Prevents QR code reuse. |
| `merchant_subscriptions` | Links customers to merchants they've subscribed to |

## TOTP Dynamic QR Flow

1. **Client registers** → `auth_users.totp_secret` auto-generated (Base32, 20 bytes)
2. **Client calls** `GET /api/client/qr/current` → server computes TOTP (RFC 6238, HMAC-SHA1, 6 digits, 30s)
3. **Client displays QR** containing `{ v:1, u:userId, t:totp, ts:timestamp }`
4. **Cashier scans** QR → sends payload to `POST /api/cashier/verify`
5. **Server verifies**: TOTP validity → anti-replay check → returns card balances

**Testing shortcut**: The verify endpoint also accepts `{ customerId: "..." }` to skip QR/OTP verification entirely, or `{ customerId: "...", qrPayload: "123456" }` to verify just the 6-digit TOTP code without the full QR payload.

## Backend Architecture

### Routes (`routes/`)

| File | Prefix | Auth | Description |
|------|--------|------|-------------|
| `otp.ts` | `/api/auth/otp/*` | None | Email verification + password reset OTPs |
| `me.ts` | `/api/me` | Required | Profile GET/PATCH |
| `client.ts` | `/api/client` | client+ | Subscribe, QR provision, current QR, cards, transactions, rewards, merchants list |
| `cashier.ts` | `/api/cashier` | business | Verify QR/customerId, adjust points, merchant info, rewards, redeem, stamps |
| `business.ts` | `/api/business` | business | Dashboard, staff CRUD, customers, transactions, rewards CRUD, settings |
| `admin.ts` | `/api/admin` | admin | Stats, users CRUD, merchants CRUD, merchant staff/stats/customers/adjust/fund/revoke, rate limits |

### Services (`services/`)

| File | Description |
|------|-------------|
| `otp.ts` | OTP generation, Resend email sending, verification |
| `totp.ts` | RFC 6238 TOTP (generate secret, generate/verify code, build/parse QR payload, anti-replay signature) |
| `stamp.ts` | Verify QR (full payload or customerId), adjust fidelity points (cashier + admin), get/create card |
| `analytics.ts` | Business dashboard stats, customer lists, transaction history |

### Middleware

| File | Description |
|------|-------------|
| `auth.ts` | `sessionMiddleware` (extract session from cookie) + `requireAuth()` |
| `requireRole.ts` | Role-based access control. `requireRole('admin')`, `requireRole('cashier', 'business')` |
| `rateLimit.ts` | IP-based rate limiter (DB-backed, 15-min windows) |
| `securityHeaders.ts` | CSP, HSTS, X-Frame-Options, etc. |

### Rate Limiting

| Group | Limit | Window |
|-------|-------|--------|
| `otp-send` | 3 | 15 min |
| `otp-verify` | 5 | 15 min |
| `auth` | 10 | 15 min |
| `api` | 100 | 15 min |

### Key Backend Files

- **Auth** (`auth.ts`): Better Auth with drizzle adapter, SHA-256+salt passwords, Google/Facebook OAuth, session role stamping. Database hooks: `user.create.after` generates TOTP secret + creates profile; `session.create.before` stamps role from profile.
- **Schema** (`db/schema.ts`): Better Auth tables + loyalty platform tables (`merchants`, `merchantStaff`, `customerCards`, `rewards`, `stampTransactions`, `usedQrSignatures`, `merchantSubscriptions`)
- **TOTP** (`services/totp.ts`): RFC 6238 compliant. HMAC-SHA1, 6 digits, 30s period, ±1 window tolerance. Uses Web Crypto API (Workers-compatible).
- **Stamp** (`services/stamp.ts`): Two verify paths — `verifyQr()` (full QR payload with anti-replay) and `verifyQrByCustomerId()` (customerId only, optional TOTP, no anti-replay). `adjustBalance()` and `adminAdjustBalance()` for fidelity point adjustments.

### Seed Data

Run `pnpm run db:seed` from the `backend/` directory. Seeds:

- 3 users: admin, business, client (all `password123`)
- 1 merchant: "Café Bonjour" (slug: `cafe-bonjour`, plan: growth) with a **100 point balance** (`pointsBalance` 100 / `pointsFunded` 100)
- 2 rewards: Free Coffee (10 pts), Free Pastry (20 pts)
- Client card: **7 fidelity points**, 15 lifetime, 3 transactions (earn 8, earn 7, redeem 8)

### Environment Variables

| Key | Default / Notes |
|-----|----------------|
| `DEPLOYMENT_MODE` | auto (`vps` or `cloudflare`) |
| `CORS_ORIGIN` | auto-detected local IP |
| `BETTER_AUTH_API_KEY` | fallback: `dev-only-better-auth-secret-min-32-chars!` |
| `BETTER_AUTH_URL` | `http://localhost:8787` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Facebook OAuth |
| `RESEND_API_KEY` / `RESEND_FROM` | Email via Resend |
| `DISABLE_RATE_LIMITING` | `'true'` to disable rate limiting (dev only) |
| `DISABLE_AUTH` | `'true'` to bypass auth middleware for local dev |
| `LOCAL_DB_PATH` | `file:../database/app.db` — local SQLite path |
| `PORT` | 8787 |
| `FRONTEND_URL` | used for CORS and redirect URLs |

## Coding Conventions

- No comments in code unless absolutely necessary
- TypeScript throughout (backend and frontend)
- Svelte 5 runes: `$state()`, `$derived()`, `$effect()`
- Drizzle ORM for all DB queries
- Role-based auth: `requireRole('admin')`, `requireRole('cashier', 'business')` middleware
- Tailwind CSS v4 for all styling
- i18n via `lib/i18n.svelte.ts` + `t()` function in templates
- Imports: `import X from './X.svelte'` — no barrel files
- File naming: PascalCase for components, camelCase for utilities/stores
- `.svelte.ts` extension for reactive store modules
- Zod validation on all mutation endpoints
