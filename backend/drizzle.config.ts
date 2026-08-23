import { defineConfig } from 'drizzle-kit'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localDbPath = 'file:/' + join(__dirname, '../database/app.db').replace(/\\/g, '/')

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: { url: localDbPath },
  studio: {
    port: 4242,
    host: 'localhost',
  },
})
