import { defineConfig } from 'drizzle-kit'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localDbPath = pathToFileURL(join(__dirname, '../database/app.db')).href

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
