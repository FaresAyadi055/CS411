<script lang="ts">
  import { Layers, Database, ShieldCheck } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { VERSION } from '../lib/config'

  const points = [
    { icon: Layers, title: 'Hono + Svelte 5', text: 'A minimal Hono API in Bun or Cloudflare Workers with a Svelte 5 (runes) single-page frontend.' },
    { icon: Database, title: 'Drizzle + SQLite', text: 'Type-safe SQLite schema managed with Drizzle ORM, running on a local SQLite file.' },
    { icon: ShieldCheck, title: 'Better Auth', text: 'Email/password, social OAuth, and email OTP verification — plus rate limiting and security headers.' },
  ]
</script>

<main class="px-4 py-4">
  <h1 class="text-xl font-bold mb-2">{t('nav.about')}</h1>
  <p class="text-sm text-on-surface-variant mb-6">AppBase is a generic starter template: a PocketBase-style alternative with user and admin CRUD out of the box.</p>

  <section class="space-y-3 mb-8">
    {#each points as p}
      <div class="card p-4 flex gap-3">
        <div class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-primary bg-primary/10">
          <p.icon size={18} />
        </div>
        <div>
          <h3 class="font-semibold text-sm mb-1">{p.title}</h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">{p.text}</p>
        </div>
      </div>
    {/each}
  </section>

  <p class="text-xs text-on-surface-variant">&copy; {new Date().getFullYear()} AppBase. All rights reserved.</p>
  <p class="text-xs text-on-surface-variant mt-1">v{VERSION}</p>
</main>