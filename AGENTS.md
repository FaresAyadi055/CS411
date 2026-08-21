# AppBase

A generic, bare-bones backend + frontend starter — a PocketBase-style alternative. Users + admins, auth, and a minimal UI.

## Domain

Generic starter template. Swap branding/domain before deploying.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Hono + Drizzle ORM + Better Auth |
| Database | Turso (SQLite) with libSQL client |
| Auth | Better Auth (email/password, bearer tokens, Google/Facebook OAuth, email OTP) |
| Frontend | Svelte 5 (runes mode, CSR) + Vite 8 |
| Styling | Tailwind CSS v4 |
| Icons | @lucide/svelte |
| Email | Resend (OTP verification/reset) |
| Package | pnpm monorepo |

## Project Structure

```
app/
├── backend/                    # Hono API server
│   ├── src/
│   │   ├── db/                 # Schema, manual migrations, seed
│   │   ├── routes/             # API handlers (otp, me, admin)
│   │   ├── services/           # Business logic (otp)
│   │   ├── middleware/         # Auth, rate limiting, role checks, security headers
│   │   ├── config/             # Env configuration
│   │   └── lib/                # Shared utilities (password hashing, errors)
│   └── .env
├── database/                   # SQLite DB (app.db)
├── frontend/                   # Svelte SPA
│   ├── src/
│   │   ├── pages/              # Home, Login, Register, ForgotPassword, Settings, About, admin/
│   │   ├── components/         # TopBar, BottomNav, SocialLoginButtons, Toast, LocaleFlag, Tooltip, Skeleton
│   │   ├── stores/             # router, auth, theme, toast, i18n
│   │   └── lib/                # API client, types, i18n translations
│   └── .env
└── pnpm-workspace.yaml
```

## Frontend Architecture

### Routes (hash-based, custom router in `stores/router.svelte.ts`)

| Route | Page component | Auth |
|-------|---------------|------|
| `home` | Home.svelte | No |
| `login` | Login.svelte | No |
| `register` | Register.svelte | No |
| `forgot-password` | ForgotPassword.svelte | No |
| `about` | About.svelte | No |
| `settings` | Settings.svelte | Yes |
| `admin` | admin/Dashboard.svelte | Admin |
| `oauth-callback` | OAuthCallback.svelte | No |
| `not-found` | NotFound.svelte | No |

Route rendering is in App.svelte with conditional blocks (`{#if getRoute() === 'home'}`). Navigation via `navigate(route, params)`. `admin` accepts a `section` param (`overview`, `users`, `rate-limits`).

### API Client (`lib/api.ts`)

Lightweight fetch wrapper:
- `api.get<T>(path)`, `api.post<T>(path, body?)`, `api.patch<T>(path, body)`, `api.put<T>(path, body)`, `api.delete<T>(path)`
- Base URL from `import.meta.env.VITE_API_URL` (defaults to `''`)
- Auth: session cookie (`credentials: 'include'`) set by Better Auth on sign-in; the API client never sends an Authorization header
- GET cache: 15-second TTL in a Map; mutations clear the cache
- 401 response clears session via `clearSession()`
- Errors thrown as `ApiRequestError` (`.message`, `.status`, `.code`)
- 10-second AbortController timeout on all requests

### Auth Store (`stores/auth.svelte.ts`)

Key functions: `checkSession()`, `login()`, `register()`, `logout()`, `socialLogin()`, `resolveOAuthSession()`, `hasRole(role)`, `isAuthenticated()`, `isLoading()`, `getUser()`, plus OTP helpers (`sendVerificationOtp`, `verifyEmailOtp`, `sendResetOtp`, `resetPassword`).

### Conventions

- Svelte 5 runes: `$state()`, `$derived()`, `$effect()`
- `.svelte.ts` extension for reactive stores
- Tailwind CSS v4 utility classes (`bg-surface-container`, `text-on-surface-variant`, etc.)
- @lucide/svelte for icons
- i18n: `stores/i18n.svelte.ts` — no, `lib/i18n.svelte.ts` with translations in EN/FR/AR
- Toast notifications via `stores/toast.svelte.ts` + `components/Toast.svelte`; usage: `showToast('success'|'error', message)`

## Backend Architecture

### Routes (`routes/`)

| File | Prefix | Auth |
|------|--------|------|
| `otp.ts` | `/api/auth/otp/*` | None |
| `me.ts` | `/api/me` | Required |
| `admin.ts` | `/api/admin` | admin only |

Auth routes (`/api/auth/*`) handled by Better Auth automatically. The static `/health` endpoint reports DB connectivity (Worker mode).

### Rate Limiting (middleware/rateLimit.ts)

Groups per IP/reason, window 15 min unless noted:

| Group | Limit | Paths |
|-------|-------|-------|
| `otp-send` | 3 / 15 min | otp send endpoints |
| `otp-verify` | 5 / 15 min | otp verify endpoints |
| `auth` | 10 / 15 min | `/api/auth/*` |
| `api` | 100 / 15 min | everything else under `/api` |

### Key Backend Files

- **Auth** (`auth.ts`): Better Auth with drizzle adapter, email+password (SHA-256 + salt), Google/Facebook OAuth, `apiKey` plugin, session role field. Database hooks: `user.create.after` creates the profile row in the `user` table; `session.create.before` stamps `role` from the profile.
- **Schema** (`db/schema.ts`): Better Auth tables (`authUsers`, `session`, `account`, `verification`, `jwks`, `apikey`) + app tables (`user`, `rateLimitLog`).
- **OTP** (`services/otp.ts`, `routes/otp.ts`): email verification and password reset codes via Resend, stored in the `verification` table with 15-min expiry.
- **Seed** (`db/seed.ts`): creates `admin@example.com` / `password123`.

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

## Database Schema (Drizzle ORM, SQLite/Turso)

### Better Auth Tables (managed by Better Auth)
`auth_users`, `session`, `account`, `verification`, `jwks`, `apikey`

### App Tables

| Table | Key Columns |
|-------|------------|
| `user` | `id` (FK → auth_users), `role` (user/admin), `firstName`, `lastName`, `email`, `address`, `locale` |
| `rate_limit_log` | `id`, `ipAddress`, `reason`, `triggeredAt`, `isResolved` |

## API Reference (Key Endpoints)

### Auth (Better Auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up/email` | Register `{ email, password, name }` |
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

### Me (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Profile |
| PATCH | `/api/me` | Update profile `{ firstName, lastName, address, locale }` |

### Admin (admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Users / admins / new-in-24h / rate-limited-24h |
| GET | `/api/admin/users` | List users (max 500) |
| GET | `/api/admin/users/:id` | Single user |
| PATCH | `/api/admin/users/:id` | Update role / profile |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/rate-limits` | Recent rate-limit hits |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health + DB check |

## Coding Conventions

- No comments in code unless absolutely necessary
- TypeScript throughout (backend and frontend)
- Svelte 5 runes: `$state()`, `$derived()`, `$effect()`
- Drizzle ORM for all DB queries
- Role-based auth: `requireRole('admin')` middleware
- Tailwind CSS v4 for all styling
- i18n via `lib/i18n.svelte.ts` + `t()` function in templates
- Imports: `import X from './X.svelte'` — no barrel files
- File naming: PascalCase for components, camelCase for utilities/stores
- `.svelte.ts` extension for reactive store modules