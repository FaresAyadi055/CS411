# Fidelito

Digital loyalty card PWA for Tunisian businesses. Customers get dynamic TOTP QR codes that refresh every 30 seconds; cashiers scan to stamp loyalty cards. Businesses manage staff, rewards, and analytics.

## Quick Start

```bash
# Install dependencies
pnpm install

# Seed the demo database
cd backend && pnpm run db:seed

# Start dev server (backend + frontend)
pnpm dev
```

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `password123` |
| Business | `business@example.com` | `password123` |
| Client | `client@example.com` | `password123` |

The demo client card is pre-seeded with **7 fidelity points** (out of 10 per reward), **15 lifetime points**, and **3 transactions** at "Café Bonjour".

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
| POST | `/api/client/subscribe` | Subscribe to a merchant `{ merchantId }` |
| POST | `/api/client/qr/provision` | Generate TOTP secret + return QR data URI |
| GET | `/api/client/qr/current` | Current TOTP + QR (refreshes every 30s) |
| GET | `/api/client/cards` | List all merchant cards with stamp balances |
| GET | `/api/client/cards/:merchantId` | Single card detail + stamp history |
| GET | `/api/client/transactions` | All stamp transactions |
| GET | `/api/client/rewards/available` | List redeemable rewards |
| GET | `/api/client/merchants` | List all merchants with subscriber counts |

### Cashier

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cashier/verify` | Verify QR / customerId and return card balances (see below) |
| POST | `/api/cashier/adjust` | Adjust fidelity points `{ customerId, amount }` |
| GET | `/api/cashier/merchant` | Own merchant info |
| GET | `/api/cashier/rewards` | List available rewards for own merchant |
| POST | `/api/cashier/redeem` | Redeem reward `{ customerId, rewardId }` |
| GET | `/api/cashier/stamps` | Recent stamps by this cashier |

#### Cashier Verify — Request Body

The `/api/cashier/verify` endpoint accepts three input modes:

```jsonc
// 1. Full QR scan (production)
{ "qrPayload": "{\"v\":1,\"u\":\"...\",\"t\":\"123456\",\"ts\":...}" }

// 2. Customer ID + 6-digit TOTP (test with verification)
{ "customerId": "user-id", "qrPayload": "123456" }

// 3. Just Customer ID (test, skip TOTP entirely)
{ "customerId": "user-id" }
```

At least one of `qrPayload` or `customerId` is required.

### Business

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/business/dashboard` | Analytics: points, customers, activity (query param: `days`, default 14) |
| GET | `/api/business/staff` | List staff with per-staff stats |
| POST | `/api/business/staff` | Add staff `{ email, role? }` |
| DELETE | `/api/business/staff/:userId` | Remove staff |
| PATCH | `/api/business/staff/:userId` | Update staff role |
| GET | `/api/business/customers` | List customers with balances |
| GET | `/api/business/transactions` | All transactions (query param: `limit`, default 50) |
| GET | `/api/business/rewards` | List rewards |
| POST | `/api/business/rewards` | Create reward `{ title, description?, stampsCost? }` |
| PATCH | `/api/business/rewards/:id` | Update reward |
| DELETE | `/api/business/rewards/:id` | Delete reward |
| PATCH | `/api/business/settings` | Update merchant settings `{ name?, stampsPerReward?, logoUrl? }` |

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
| POST | `/api/admin/merchants` | Create merchant + assign owner `{ name, slug, ownerEmail, stampsPerReward?, planTier?, initialPoints? }` |
| GET | `/api/admin/merchants/:id` | Get merchant |
| PATCH | `/api/admin/merchants/:id` | Update merchant |
| DELETE | `/api/admin/merchants/:id` | Soft-delete merchant (set inactive) |
| GET | `/api/admin/merchants/:id/staff` | List merchant staff |
| GET | `/api/admin/merchants/:id/stats` | Merchant analytics |
| GET | `/api/admin/merchants/:id/customers` | List merchant customers with balances and spend |
| POST | `/api/admin/merchants/:id/adjust` | Adjust customer points `{ customerId, amount }` |
| POST | `/api/admin/merchants/:id/fund` | Fund merchant point balance `{ amount }` |
| POST | `/api/admin/merchants/:id/revoke` | Revoke merchant points `{ amount }` |

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
