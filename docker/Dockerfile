# Backend API image — Hono + Better Auth + Drizzle ORM + libSQL (SQLite)
# Run via docker-compose in ../docker-compose.yml
FROM oven/bun:1.2 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --production --no-frozen-lockfile

FROM oven/bun:1.2 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
# Persist the SQLite database on a mounted volume (see compose)
ENV LOCAL_DB_PATH=file:/data/app.db

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure the database directory exists even if no external volume is mounted
RUN mkdir -p /data

EXPOSE 8787

# Idempotent migrations first, then start the API server
CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/server.ts"]
