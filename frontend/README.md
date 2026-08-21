# AppBase Frontend

Svelte 5 (runes) single-page app with Vite, Tailwind CSS v4, and a custom hash router.

## Pages

| Route | Description |
|-------|-------------|
| `home` | Landing page |
| `login` / `register` / `forgot-password` | Auth flows (email + OAuth + OTP) |
| `about` | About the starter |
| `settings` | Theme, language, account |
| `admin` | Admin dashboard (users, rate limits) |

## Setup

```sh
pnpm install
pnpm dev
```

The Vite dev server proxies `/api` and `/health` to the backend at `http://127.0.0.1:8787`.

Set `VITE_API_URL` to the API base URL in production (defaults to the same origin).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the build |
| `pnpm deploy` | Deploy to Cloudflare Pages/Workers |
| `pnpm type-check` | Run svelte-check |

## Stack

- **Framework:** Svelte 5 (runes mode, CSR) + Vite 8
- **Styling:** Tailwind CSS v4
- **Icons:** @lucide/svelte
- **Auth:** Better Auth client
- **i18n:** en / fr / ar stores in `src/lib/i18n.svelte.ts`