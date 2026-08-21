# AppBase Backend

Generic API server (Hono + Drizzle + Turso/Better Auth) — PocketBase-style starter with minimal user/admin CRUD.

## Setup

```sh
pnpm install   # or: bun install (installs workspace deps from repo root)
```

Copy `.env.example` to `.env` and fill in required variables:

```sh
PORT=8787
TURSO_SQLITE_DATABASE_URL=
TURSO_TOKEN=
CORS_ORIGIN=http://localhost:5173
RESEND_API_KEY=
RESEND_FROM="AppBase <contact@example.com>"
BETTER_AUTH_API_KEY=change-me-min-32-chars-long-secret!!
BETTER_AUTH_URL=http://localhost:8787
FRONTEND_URL=http://localhost:5173
```

When Turso is not configured, the API falls back to a local SQLite database
(`../database/app.db`, `USE_LOCAL_DB=true`).

## Dev

```sh
bun install   # or: pnpm install
bun dev       # API server with watch (Bun)
bun run db:seed    # Seed admin demo account
bun run db:migrate:manual # Create tables (local SQLite)
```

**Demo credentials:** `admin@example.com` / `password123`

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start API server with watch |
| `bun start` | Start API server (production) |
| `bun run dev:worker` | Run Cloudflare Worker locally |
| `bun run deploy` | Deploy Cloudflare Worker |
| `bun run db:generate` | Generate Drizzle migration |
| `bun run db:push` | Push schema to Turso |
| `bun run db:migrate:manual` | Run manual migrations |
| `bun run db:seed` | Seed demo data |
| `bun run typecheck` | TypeScript check |

## Stack

- **Runtime:** Bun via `Bun.serve` (`hono/bun`) or Cloudflare Workers
- **Framework:** Hono
- **ORM:** Drizzle + `@libsql/client`
- **Auth:** Better Auth (email/password + Google/Facebook OAuth + OTP verification/reset)
- **Email:** Resend (OTP codes)
- **Database:** Turso (libSQL/SQLite)