<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowLeft } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import { getUser } from '../stores/auth.svelte'
  import api from '../lib/api'
  import type { Merchant } from '../lib/types'
  import { setBusinessPoints } from '../stores/businessPoints.svelte'

  let merchant = $state<Merchant | null>(null)
  let loading = $state(true)
  let error = $state(false)

  let balance = $derived(Math.max(0, merchant?.pointsBalance ?? 0))
  let funded = $derived(merchant?.pointsFunded ?? 0)
  let given = $derived(Math.max(0, funded - balance))
  let pct = $derived(funded > 0 ? Math.min(100, (given / funded) * 100) : 0)
  let lowBalance = $derived(balance <= 0)

  const R = 84
  const C = 2 * Math.PI * R
  let dash = $state(C)

  onMount(async () => {
    try {
      const d = await api.get<{ merchant: Merchant }>('/api/cashier/merchant')
      merchant = d.merchant
      setBusinessPoints(Math.max(0, d.merchant.pointsBalance))
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
      <p class="text-4xl font-bold mt-1" class:text-lost-text={lowBalance} class:text-primary={!lowBalance}>{balance.toLocaleString()}</p>
      <p class="text-xs text-on-surface-variant mt-0.5">{t('points.balance_sub')}</p>
    </div>

    {#if lowBalance}
      <div class="card p-4 mb-4 bg-amber-50 border border-amber-300 text-amber-800 text-sm">
        <p class="font-semibold">{t('points.out_of_points_title')}</p>
        <p class="mt-1">{t('points.out_of_points_desc')}</p>
      </div>
    {/if}

    <div class="card p-6 flex flex-col items-center animate-slide-up">
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
            stroke={lowBalance ? 'var(--color-lost-text)' : 'var(--color-primary)'}
            stroke-width="16"
            stroke-linecap="round"
            stroke-dasharray={C}
            stroke-dashoffset={dash}
            style="transition: stroke-dashoffset 1s ease-out;"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold">{Math.round(pct)}%</span>
          <span class="text-xs text-on-surface-variant">{t('points.given')}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 w-full mt-6">
        <div class="card p-3 text-center bg-surface-container-low">
          <p class="text-lg font-bold text-lost-text">{given.toLocaleString()}</p>
          <p class="text-[11px] text-on-surface-variant">{t('points.given')}</p>
        </div>
        <div class="card p-3 text-center bg-surface-container-low">
          <p class="text-lg font-bold text-primary">{funded.toLocaleString()}</p>
          <p class="text-[11px] text-on-surface-variant">{t('points.funded')}</p>
        </div>
      </div>

      <p class="text-xs text-on-surface-variant mt-4 text-center">
        {t('points.given_of', { given: given.toLocaleString(), funded: funded.toLocaleString() })}
      </p>
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
