<script lang="ts">
  import { onMount } from 'svelte'
  import { CreditCard, ChevronRight } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import api from '../lib/api'
  import StarBadge from '../components/StarBadge.svelte'
  import type { CustomerCard } from '../lib/types'

  let cards = $state<CustomerCard[]>([])
  let loading = $state(true)

  onMount(async () => {
    try {
      const data = await api.get<{ cards: CustomerCard[] }>('/api/client/cards')
      cards = data.cards
    } catch {}
    loading = false
  })

  function formatDate(ts: number | null): string {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString()
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="mb-6 animate-fade-in">
    <h1 class="text-xl font-bold">{t('cards.title')}</h1>
  </div>

  {#if loading}
    <div class="space-y-3">
      {#each [1, 2, 3] as _}
        <div class="card p-4 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-surface-container-high"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-surface-container-high rounded w-1/3"></div>
              <div class="h-3 bg-surface-container-high rounded w-1/2"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if cards.length === 0}
    <div class="card p-8 text-center animate-fade-in">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-container-high flex items-center justify-center">
        <CreditCard size={28} class="text-on-surface-variant" />
      </div>
      <h2 class="font-semibold mb-1">{t('cards.empty')}</h2>
      <p class="text-sm text-on-surface-variant">{t('cards.empty.desc')}</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each cards as card, i}
        <button
          onclick={() => navigate('card', { merchantId: card.merchantId })}
          class="card p-4 w-full text-left flex items-center gap-3 hover:bg-surface-container-low transition-all duration-200 animate-slide-up"
          style="animation-delay: {i * 50}ms"
        >
          {#if card.merchantLogo}
            <img src={card.merchantLogo} alt="" class="w-12 h-12 rounded-xl object-cover shrink-0" />
          {:else}
            <StarBadge size={48} star={22} />
          {/if}
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">{card.merchantName || 'Partner'}</p>
            <p class="text-xs text-on-surface-variant">{t('cards.points', { n: card.fidelityPoints.toString() })}</p>
          </div>
          <ChevronRight size={18} class="text-on-surface-variant shrink-0" />
        </button>
      {/each}
    </div>
  {/if}
</main>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fade-in 0.3s ease-out; }
  .animate-slide-up { animation: slide-up 0.3s ease-out both; }
</style>
