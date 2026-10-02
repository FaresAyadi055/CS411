import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './config/env'
import { db } from './db'
import { startCleanup } from './lib/cleanup'
import { networkInterfaces } from 'node:os'

function getLocalIP(): string {
  for (const iface of Object.values(networkInterfaces())) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address
    }
  }
  return '127.0.0.1'
}

async function checkDbReady() {
  try {
    await db.run("SELECT 1")
    console.log('  Database:  ready')
  } catch (e) {
    console.error('Database not found or inaccessible:', e instanceof Error ? e.message : String(e))
    console.error('Run: pnpm run db:migrate:manual')
    process.exit(1)
  }
}

const app = createApp()
const localIP = getLocalIP()

checkDbReady().then(() => {
  startCleanup()
  const server = serve(
    {
      fetch: app.fetch,
      port: env.port,
      hostname: '0.0.0.0',
    },
    () => {
      console.log(`\n  API running (Node):`)
      console.log(`    Local:   http://localhost:${env.port}`)
      console.log(`    Network: http://${localIP}:${env.port}\n`)
    }
  )
  server.on('error', (err) => {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EADDRINUSE') {
      console.error(`\n  Port ${env.port} is already in use — another server is already running.`)
      console.error(`  Stop it (lsof -i :${env.port}) or run with PORT=<other port> pnpm run dev\n`)
    } else {
      console.error('Server failed to start:', err.message)
    }
    process.exit(1)
  })
})
