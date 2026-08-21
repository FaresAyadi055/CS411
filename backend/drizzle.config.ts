import { defineConfig } from 'drizzle-kit'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localDbPath = 'file:/' + join(__dirname, '../database/app.db').replace(/\\/g, '/')

const mode = (process.env.DEPLOYMENT_MODE ?? 'vps') as 'vps' | 'cloudflare'
const tursoUrl = process.env.TURSO_SQLITE_DATABASE_URL
const tursoToken = process.env.TURSO_TOKEN

const useTurso = mode === 'cloudflare' && tursoUrl && tursoToken

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: useTurso
    ? { url: tursoUrl, authToken: tursoToken }
    : { url: localDbPath },
})
