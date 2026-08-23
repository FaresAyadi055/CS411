<script lang="ts">
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { onMount, tick } from 'svelte'
  import { ArrowLeft, Star, Gift, MapPin, Clock, Info } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate, getRouteParams } from '../stores/router.svelte'
  import api from '../lib/api'
  import { showToast } from '../stores/toast.svelte'
  import type { StoreCard } from '../lib/types'
  import StarBadge from '../components/StarBadge.svelte'

  const pinIcon = L.divIcon({
    className: 'fidelito-pin',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#16a34a" stroke="#ffffff" stroke-width="1.5"><path d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#ffffff"/></svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  })

  type Reward = {
    id: string
    title: string
    description: string | null
    stampsCost: number
    imageUrl: string | null
    canRedeem: boolean
  }

  type Tx = {
    id: string
    type: string
    balanceType: 'fidelity' | 'meal_voucher'
    rewardId: string | null
    amount: number
    createdAt: number
  }

  const params = getRouteParams()
  let merchantId = $derived(params.merchantId || '')

  let card = $state<StoreCard | null>(null)
  let transactions = $state<Tx[]>([])
  let rewards = $state<Reward[]>([])
  let loading = $state(true)

  let mapEl = $state<HTMLDivElement | null>(null)
  let map: L.Map | null = null

  let subscribing = $state(false)

  async function load() {
    try {
      const data = await api.get<{ card: StoreCard; transactions: Tx[]; rewards: Reward[] }>(
        `/api/client/cards/${merchantId}`,
      )
      card = data.card
      transactions = data.transactions || []
      rewards = data.rewards || []
    } catch {}
    loading = false
    await tick()
    createMap()
  }

  onMount(() => {
    load()
    return () => { map?.remove() }
  })

  async function subscribeToMerchant() {
    subscribing = true
    try {
      await api.post('/api/client/subscribe', { merchantId })
      showToast('success', t('partners.subscribed'))
      loading = true
      subscribing = false
      await load()
    } catch (e: any) {
      showToast('error', e.message || t('partners.subscribe_error'))
      subscribing = false
    }
  }

  function createMap() {
    if (!mapEl || !card) return
    const lat = card.merchantLat
    const lng = card.merchantLng
    if (typeof lat !== 'number' || typeof lng !== 'number') return
    map = L.map(mapEl).setView([lat, lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    L.marker([lat, lng], { icon: pinIcon }).addTo(map)
    setTimeout(() => map?.invalidateSize(), 200)
  }

  function formatTND(amount: number) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount)
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function isEarned(type: string) {
    return type === 'ADD_POINTS' || type === 'ADD_MEAL_VOUCHER'
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <button
    onclick={() => navigate('cards')}
    class="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
    <ArrowLeft size={16} />
    {t('nav.cards')}
  </button>

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  {:else if card}
    <div class="card p-6 text-center mb-4 animate-scale-in">
      <div class="mx-auto mb-3 w-16 h-16 flex items-center justify-center">
        {#if card.merchantLogo}
          <img src={card.merchantLogo} alt="" class="w-16 h-16 rounded-2xl object-cover" />
        {:else}
          <StarBadge size={64} star={28} />
        {/if}
      </div>
      <h1 class="text-lg font-bold">{card.merchantName || 'Partner'}</h1>
      {#if card.merchantAddress}
        <p class="text-xs text-on-surface-variant mt-1 flex items-center justify-center gap-1">
          <MapPin size={12} />
          {card.merchantAddress}
        </p>
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="card p-4 text-center animate-slide-up">
        <p class="text-xs text-on-surface-variant mb-1">{t('cards.balance_points')}</p>
        <p class="text-2xl font-bold text-primary">{card.fidelityPoints}</p>
        <p class="text-[10px] text-on-surface-variant">{t('transactions.fidelity')}</p>
      </div>
      <div class="card p-4 text-center animate-slide-up" style="animation-delay: 40ms">
        <p class="text-xs text-on-surface-variant mb-1">{t('cards.balance_meal')}</p>
        <p class="text-2xl font-bold text-primary">{formatTND(card.mealVoucherBalance)}</p>
        <p class="text-[10px] text-on-surface-variant">TND {t('transactions.meal')}</p>
      </div>
    </div>

    {#if typeof card.merchantLat === 'number' && typeof card.merchantLng === 'number'}
      <div class="card p-3 mb-4 animate-slide-up">
        <div class="flex items-center gap-2 mb-2 text-sm font-semibold">
          <MapPin size={16} class="text-primary" />
          {t('cards.location')}
        </div>
        <div class="h-56 rounded-xl overflow-hidden border border-outline isolate" bind:this={mapEl}></div>
      </div>
    {/if}

    <div class="mb-4 animate-slide-up">
      <h2 class="text-sm font-semibold mb-3">{t('cards.rewards')}</h2>
      {#if rewards.length === 0}
        <div class="card p-6 text-center">
          <p class="text-sm text-on-surface-variant">{t('cards.no_rewards')}</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each rewards as r, i}
            <div class="card p-3 flex items-center gap-3 animate-slide-up" style="animation-delay: {i * 40}ms">
              {#if r.imageUrl}
                <img src={r.imageUrl} alt="" class="w-12 h-12 rounded-xl object-cover shrink-0" />
              {:else}
                <StarBadge size={48} star={22} />
              {/if}
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate">{r.title}</p>
                <p class="text-xs text-on-surface-variant">{t('cards.cost', { n: r.stampsCost.toString() })}</p>
              </div>
              {#if r.canRedeem}
                <span class="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 shrink-0">
                  {t('cards.available')}
                </span>
              {:else}
                <span class="text-[10px] font-semibold px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant shrink-0">
                  {t('cards.locked')}
                </span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <h2 class="text-sm font-semibold mb-3">{t('card.history')}</h2>
    {#if transactions.length === 0}
      <div class="card p-6 text-center">
        <p class="text-sm text-on-surface-variant">{t('card.no_history')}</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each transactions as tx, i}
          <div class="card p-3 flex items-center gap-3 animate-slide-up" style="animation-delay: {i * 30}ms">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              class:bg-found-bg={isEarned(tx.type)}
              class:bg-lost-bg={!isEarned(tx.type)}>
              {#if isEarned(tx.type)}
                <Star size={14} class="text-found-text" />
              {:else}
                <Gift size={14} class="text-lost-text" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">
                {isEarned(tx.type) ? t('transactions.earned') : t('transactions.spent')}
                {tx.balanceType === 'meal_voucher' ? ' · TND' : ''}
              </p>
              <p class="text-xs text-on-surface-variant flex items-center gap-1">
                <Clock size={10} />
                {formatDate(tx.createdAt)}
              </p>
            </div>
            <span
              class="text-sm font-semibold"
              class:text-found-text={isEarned(tx.type)}
              class:text-lost-text={!isEarned(tx.type)}>
              {isEarned(tx.type) ? '+' : '-'}{tx.balanceType === 'meal_voucher' ? formatTND(tx.amount) : tx.amount}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="card p-8 text-center">
      <p class="text-sm text-on-surface-variant">{t('partners.not_member')}</p>
      <div class="flex items-center justify-center gap-2 mt-4">
        <button
          onclick={() => navigate('partners')}
          class="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm font-medium"
        >
          {t('nav.partners')}
        </button>
        <button
          onclick={subscribeToMerchant}
          disabled={subscribing}
          class="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
        >
          {subscribing ? t('common.loading') : t('partners.subscribe')}
        </button>
      </div>
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
