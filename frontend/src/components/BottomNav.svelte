<script lang="ts">
  import { Home, Info, Settings, ShieldCheck } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate, getRoute } from '../stores/router.svelte'
  import { getUser, hasRole } from '../stores/auth.svelte'

  interface NavItem {
    route: 'home' | 'about' | 'settings' | 'admin'
    icon: typeof Home
    labelKey: string
    params?: Record<string, string>
  }

  const base: NavItem[] = [
    { route: 'home', icon: Home, labelKey: 'nav.home' },
    { route: 'about', icon: Info, labelKey: 'nav.about' },
    { route: 'settings', icon: Settings, labelKey: 'nav.settings' },
  ]

  const items = $derived(
    hasRole('admin') && getUser()
      ? [...base, { route: 'admin' as const, icon: ShieldCheck, labelKey: 'nav.admin', params: { section: 'overview' } }]
      : base,
  )

  function isActive(item: NavItem) {
    return getRoute() === item.route
  }
</script>

<nav class="fixed bottom-0 inset-x-0 z-40 bg-surface-card border-t border-outline">
  <div class="mx-auto max-w-2xl flex">
    {#each items as item (item.route)}
      <button
        onclick={() => navigate(item.route, item.params)}
        aria-label={t(item.labelKey)}
        aria-current={isActive(item) ? 'page' : undefined}
        class="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] py-1.5 transition-colors"
        class:text-primary={isActive(item)}
        class:text-on-surface-variant={!isActive(item)}
      >
        {#if isActive(item)}
          <span class="absolute top-0 h-0.5 w-10 rounded-full bg-primary"></span>
          <span class="flex h-7 w-7 items-center justify-center rounded-full">
            <item.icon size={20} strokeWidth={isActive(item) ? 2.5 : 2} />
          </span>
        {:else}
          <span class="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container">
            <item.icon size={20} strokeWidth={2} />
          </span>
        {/if}
        <span class="text-[10px] font-semibold leading-tight">
          {t(item.labelKey)}
        </span>
      </button>
    {/each}
  </div>
</nav>