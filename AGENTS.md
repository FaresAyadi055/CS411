# Fidelito

Digital loyalty card PWA for Tunisian businesses. Customers get dynamic TOTP QR codes that refresh every 30 seconds; cashiers scan to stamp loyalty cards. Businesses manage staff, rewards, and analytics.

## Domain

Fidelito.tn — a digital loyalty card platform for small to medium Tunisian businesses. Each business (merchant) has isolated loyalty cards. The code works across any partner, but loyalty data is per-merchant.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Hono + Drizzle ORM + Better Auth |
| Database | Turso (SQLite) with libSQL client |
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
| `merchants` | Business profiles (owner, name, slug, stamps_per_reward, plan_tier, monthly_point_cap, points_used_month, secret_hmac_key) |
| `merchant_staff` | Links users to merchants (role: owner/cashier). Unique on (merchant_id, user_id) |
| `customer_cards` | Per-customer stamp balance per merchant. Unique on (customer_id, merchant_id) |
| `rewards` | Available rewards catalog per merchant |
| `stamp_transactions` | Audit log: EARN_STAMP / REDEEM_REWARD transactions |
| `used_qr_signatures` | Anti-replay lock. Prevents QR code reuse. |

## TOTP Dynamic QR Flow

1. **Client registers** → `auth_users.totp_secret` auto-generated (Base32, 20 bytes)
2. **Client calls** `GET /api/client/qr/current` → server computes TOTP (RFC 6238, HMAC-SHA1, 6 digits, 30s)
3. **Client displays QR** containing `{ v:1, u:userId, t:totp, ts:timestamp }`
4. **Cashier scans** QR → sends payload to `POST /api/cashier/stamp`
5. **Server verifies**: TOTP validity → anti-replay check → point cap → creates stamp transaction

## Backend Architecture

### Routes (`routes/`)

| File | Prefix | Auth | Description |
|------|--------|------|-------------|
| `otp.ts` | `/api/auth/otp/*` | None | Email verification + password reset OTPs |
| `me.ts` | `/api/me` | Required | Profile GET/PATCH |
| `client.ts` | `/api/client` | client+ | QR provision, current QR, cards, transactions, rewards |
| `cashier.ts` | `/api/cashier` | cashier+ | Stamp card, merchant info, recent stamps, redeem reward |
| `business.ts` | `/api/business` | business | Dashboard, staff CRUD, customers, transactions, rewards CRUD, settings |
| `admin.ts` | `/api/admin` | admin | Stats, users CRUD, merchants CRUD, merchant staff/stats, rate limits |

### Services (`services/`)

| File | Description |
|------|-------------|
| `otp.ts` | OTP generation, Resend email sending, verification |
| `totp.ts` | RFC 6238 TOTP (generate secret, generate/verify code, build/parse QR payload, anti-replay signature) |
| `stamp.ts` | Stamp card (verify TOTP, anti-replay, point cap, create transaction, update card) |
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
- **Schema** (`db/schema.ts`): Better Auth tables + loyalty platform tables (`merchants`, `merchantStaff`, `customerCards`, `rewards`, `stampTransactions`, `usedQrSignatures`)
- **TOTP** (`services/totp.ts`): RFC 6238 compliant. HMAC-SHA1, 6 digits, 30s period, ±1 window tolerance. Uses Web Crypto API (Workers-compatible).
- **Stamp** (`services/stamp.ts`): Full stamp flow — QR parse → TOTP verify → anti-replay → point cap check → transaction create → card update.

### Environment Variables

| Key | Default / Notes |
|-----|----------------|
| `DEPLOYMENT_MODE` | auto (`vps` or `cloudflare`) |
| `TURSO_SQLITE_DATABASE_URL` | Turso remote DB |
| `TURSO_TOKEN` | Turso auth token |
| `CORS_ORIGIN` | auto-detected local IP |
| `BETTER_AUTH_API_KEY` | fallback: `dev-only-better-auth-secret-min-32-chars!` |
| `BETTER_AUTH_URL` | `http://localhost:8787` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Facebook OAuth |
| `RESEND_API_KEY` / `RESEND_FROM` | Email via Resend |
| `DISABLE_RATE_LIMITING` | `'true'` to disable rate limiting (dev only) |
| `DISABLE_AUTH` | `'true'` to bypass auth middleware for local dev |
| `LOCAL_DB_PATH` | `file:../database/app.db` — local SQLite path when Turso not configured |
| `PORT` | 8787 |
| `FRONTEND_URL` | used for CORS and redirect URLs |

## API Reference

### Auth (Better Auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up/email` | Register `{ email, password, name }` — creates client + TOTP secret |
| POST | `/api/auth/sign-in/email` | Login `{ email, password }` |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/session` | Current session |
| GET | `/api/auth/token` | JWT token |

### OTP (email verification / password reset)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/otp/send-verification` | Send email verification code |
| POST | `/api/auth/otp/verify-email` | Verify email with code |
| POST | `/api/auth/otp/send-reset` | Send password reset code |
| POST | `/api/auth/otp/reset-password` | Reset password with code |

### Client

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/client/qr/provision` | Generate TOTP secret + return QR data URI |
| GET | `/api/client/qr/current` | Current TOTP + QR (refreshes every 30s) |
| GET | `/api/client/cards` | List all merchant cards with stamp balances |
| GET | `/api/client/cards/:merchantId` | Single card detail + stamp history |
| GET | `/api/client/transactions` | All stamp transactions |
| GET | `/api/client/rewards/available` | List redeemable rewards |

### Cashier

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cashier/stamp` | Verify QR + stamp card `{ qrPayload, stampsCount? }` |
| GET | `/api/cashier/merchant` | Own merchant info |
| GET | `/api/cashier/stamps` | Recent stamps by this cashier |
| POST | `/api/cashier/redeem` | Redeem reward `{ customerId, rewardId }` |

### Business

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/business/dashboard` | Analytics: stamps, customers, revenue, points usage |
| GET | `/api/business/staff` | List staff |
| POST | `/api/business/staff` | Add staff `{ email, role? }` |
| DELETE | `/api/business/staff/:userId` | Remove staff |
| PATCH | `/api/business/staff/:userId` | Update staff role |
| GET | `/api/business/customers` | List customers with balances |
| GET | `/api/business/transactions` | All transactions (paginated) |
| GET | `/api/business/rewards` | List rewards |
| POST | `/api/business/rewards` | Create reward |
| PATCH | `/api/business/rewards/:id` | Update reward |
| DELETE | `/api/business/rewards/:id` | Delete reward |
| PATCH | `/api/business/settings` | Update merchant settings |

### Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Profile |
| PATCH | `/api/me` | Update profile `{ firstName, lastName, address, locale }` |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Platform-wide stats |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/users/:id` | Get user |
| PATCH | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/rate-limits` | Recent rate-limit hits |
| GET | `/api/admin/merchants` | List all merchants |
| POST | `/api/admin/merchants` | Create merchant + assign owner |
| GET | `/api/admin/merchants/:id` | Get merchant |
| PATCH | `/api/admin/merchants/:id` | Update merchant |
| DELETE | `/api/admin/merchants/:id` | Soft-delete merchant |
| GET | `/api/admin/merchants/:id/staff` | List merchant staff |
| GET | `/api/admin/merchants/:id/stats` | Merchant analytics |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health + DB check |

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
