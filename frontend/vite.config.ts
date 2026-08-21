import { defineConfig } from 'vite'

const isProd = process.env.NODE_ENV === 'production'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
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

export default defineConfig({
  plugins: [tailwindcss(), svelte({ inspector: !isProd })],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
})
