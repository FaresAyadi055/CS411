<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowLeft, Coins } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import { getUser } from '../stores/auth.svelte'
  import api from '../lib/api'
  import type { Merchant } from '../lib/types'
  import { setBusinessPoints } from '../stores/businessPoints.svelte'

  let merchant = $state<Merchant | null>(null)
  let loading = $state(true)
  let error = $state(false)

  let cap = $derived(merchant?.monthlyPointCap ?? 0)
  let used = $derived(merchant?.pointsUsedMonth ?? 0)
  let remaining = $derived(Math.max(0, cap - used))
  let pct = $derived(cap > 0 ? Math.min(100, (used / cap) * 100) : 0)
  let reachedCap = $derived(cap > 0 && remaining <= 0)

  const R = 84
  const C = 2 * Math.PI * R
  let dash = $state(C)

  onMount(async () => {
    try {
      const d = await api.get<{ merchant: Merchant }>('/api/cashier/merchant')
      merchant = d.merchant
      setBusinessPoints(Math.max(0, d.merchant.monthlyPointCap - d.merchant.pointsUsedMonth))
    } catch {
      error = true
    } finally {
      loading = false
    }
  })

  $effect(() => {
    if (merchant) {
      const target = C * (1 - pct / 100)
      requestAnimationFrame(() => {
        dash = target
      })
    }
  })

  function goBack() {
    const user = getUser()
    navigate(user?.role === 'cashier' ? 'scan' : 'dashboard')
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <button
    onclick={goBack}
    class="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors"
  >
    <ArrowLeft size={16} />
    {t('nav.points')}
  </button>

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  {:else if error}
    <div class="card p-8 text-center">
      <p class="text-sm text-on-surface-variant">{t('points.error')}</p>
    </div>
  {:else}
    <div class="card p-6 text-center mb-4 animate-scale-in">
      <p class="text-xs text-on-surface-variant uppercase tracking-wide">{t('points.balance')}</p>
      <p class="text-4xl font-bold text-primary mt-1">{remaining.toLocaleString()}</p>
      <p class="text-xs text-on-surface-variant mt-0.5">{t('points.balance_sub')}</p>
    </div>

    <div class="card p-6 flex flex-col items-center animate-slide-up">
      {#if cap > 0}
        <div class="relative w-[200px] h-[200px]">
          <svg viewBox="0 0 200 200" class="w-full h-full -rotate-90">
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="var(--color-outline)"
              stroke-width="16"
            />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={reachedCap ? 'var(--color-lost-text)' : 'var(--color-primary)'}
              stroke-width="16"
              stroke-linecap="round"
              stroke-dasharray={C}
              stroke-dashoffset={dash}
              style="transition: stroke-dashoffset 1s ease-out;"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold">{Math.round(pct)}%</span>
            <span class="text-xs text-on-surface-variant">{t('points.used')}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 w-full mt-6">
          <div class="card p-3 text-center bg-surface-container-low">
            <p class="text-lg font-bold text-lost-text">{used.toLocaleString()}</p>
            <p class="text-[11px] text-on-surface-variant">{t('points.used')}</p>
          </div>
          <div class="card p-3 text-center bg-surface-container-low">
            <p class="text-lg font-bold text-primary">{cap.toLocaleString()}</p>
            <p class="text-[11px] text-on-surface-variant">{t('points.cap')}</p>
          </div>
        </div>

        <p class="text-xs text-on-surface-variant mt-4 text-center">
          {t('points.used_of', { used: used.toLocaleString(), cap: cap.toLocaleString() })}
        </p>
        {#if reachedCap}
          <p class="text-xs font-semibold text-lost-text mt-2 text-center">{t('points.full')}</p>
        {/if}
      {:else}
        <div class="flex flex-col items-center py-6 text-center">
          <Coins size={40} class="text-on-surface-variant mb-3" />
          <p class="text-sm text-on-surface-variant">{t('points.no_cap')}</p>
        </div>
      {/if}
    </div>
  {/if}
</main>

<style>
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-scale-in { animation: scale-in 0.3s ease-out; }
  .animate-slide-up { animation: slide-up 0.3s ease-out both; }
</style>
