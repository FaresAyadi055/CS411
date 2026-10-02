# AppBase Backend

Generic API server (Hono + Drizzle + SQLite/Better Auth) — PocketBase-style starter with minimal user/admin CRUD.

## Setup

```sh
pnpm install
```

Copy `.env.example` to `.env` and fill in required variables:

```sh
PORT=8787
CORS_ORIGIN=http://localhost:5173
RESEND_API_KEY=
RESEND_FROM="AppBase <contact@example.com>"
BETTER_AUTH_API_KEY=change-me-min-32-chars-long-secret!!
BETTER_AUTH_URL=http://localhost:8787
FRONTEND_URL=http://localhost:5173
```

The API uses a local SQLite database (`../database/app.db`).

## Dev

```sh
pnpm install
pnpm run dev       # API server with watch (Node + tsx)
pnpm run db:seed    # Seed admin demo account
pnpm run db:migrate:manual # Create tables (local SQLite)
```

**Demo credentials:** `admin@example.com` / `password123`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start API server with watch |
| `pnpm run start` | Start API server (production) |
| `pnpm run db:generate` | Generate Drizzle migration |
| `pnpm run db:push` | Push schema to local SQLite |
| `pnpm run db:migrate:manual` | Run manual migrations |
| `pnpm run db:seed` | Seed demo data |
| `pnpm run typecheck` | TypeScript check |

## Stack

- **Runtime:** Node.js via `@hono/node-server` (TypeScript executed with `tsx`)
- **Framework:** Hono
- **ORM:** Drizzle + `@libsql/client`
- **Auth:** Better Auth (email/password + Google/Facebook OAuth + OTP verification/reset)
- **Email:** Resend (OTP codes)
- **Database:** SQLite (libSQL)