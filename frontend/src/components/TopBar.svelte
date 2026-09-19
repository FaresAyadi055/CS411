<script lang="ts">
  import { Settings, Store, Coins } from '@lucide/svelte'
  import { navigate, getRoute } from '../stores/router.svelte'
  import { t } from '../lib/i18n.svelte'
  import { getUser } from '../stores/auth.svelte'
  import { getBusinessPoints, refreshBusinessPoints } from '../stores/businessPoints.svelte'
  import Tooltip from './Tooltip.svelte'

  const bizPoints = $derived(getBusinessPoints())

  $effect(() => {
    const u = getUser()
    if (!u) return
    if (u.role === 'business') refreshBusinessPoints()
  })
</script>

<header class="bg-surface-card border-b border-outline sticky top-0 z-40 w-full">
  <div class="flex items-center justify-between px-4 h-12 w-full">
    <button onclick={() => navigate('home')} class="flex items-center gap-2 min-w-0">
      <img src="/favicon.svg" alt="" class="w-7 h-7 shrink-0" width="28" height="28" />
      <span class="font-bold text-lg text-[#00A63E] tracking-tight truncate">{t('app.name')}</span>
    </button>

    <div class="flex items-center gap-1 shrink-0">
      {#if getUser()}
        {#if getUser()?.role === 'business'}
        <Tooltip text={t('points.balance')} position="bottom">
          <button
            onclick={() => navigate('points')}
            class="flex items-center gap-1 h-8 px-2.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label={t('points.balance')}
          >
            <Coins size={15} class="text-primary" />
            <span class="text-sm font-semibold tabular-nums">{bizPoints === null ? '—' : bizPoints.toLocaleString()}</span>
          </button>
        </Tooltip>

        <Tooltip text={t('business.profile.title')} position="bottom">
          <button
            onclick={() => navigate('business-profile')}
            class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            class:text-primary={getRoute() === 'business-profile'}
            aria-label={t('business.profile.title')}
          >
            <Store size={18} />
          </button>
        </Tooltip>
      {/if}

      {#if getUser()}
        <Tooltip text={t('nav.settings')} position="bottom">
          <button
            onclick={() => navigate('settings')}
            class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            class:text-primary={getRoute() === 'settings'}
            aria-label={t('nav.settings')}
          >
            <Settings size={18} />
          </button>
        </Tooltip>
      {/if}
      {/if}

    </div>
  </div>
</header>
