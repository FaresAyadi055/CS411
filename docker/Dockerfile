# Backend API image — Hono + Better Auth + Drizzle ORM + libSQL (SQLite)
# Built from the repository root (pnpm workspace + lockfile required).
# Run via docker compose with `context: .` and `dockerfile: docker/Dockerfile`.
FROM node:22-bookworm-slim
WORKDIR /app

RUN npm install -g pnpm@10.30.2

ENV NODE_ENV=production
ENV PORT=8787
# Persist the SQLite database on a mounted volume (see compose)
ENV LOCAL_DB_PATH=file:/data/app.db

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile --prod --filter @app/backend

COPY backend/src backend/src

# Ensure the database directory exists even if no external volume is mounted
RUN mkdir -p /data

EXPOSE 8787

# Idempotent migrations first, then start the API server
CMD ["sh", "-c", "pnpm --filter @app/backend run db:migrate:manual && pnpm --filter @app/backend run start"]
