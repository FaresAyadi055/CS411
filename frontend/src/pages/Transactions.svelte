<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowDownLeft, ArrowUpRight, Gift } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'

  type Tx = {
    id: string
    merchantId: string
    merchantName: string
    type: string
    balanceType: 'fidelity' | 'meal_voucher'
    rewardId: string | null
    rewardTitle: string | null
    amount: number
    createdAt: number
  }

  let txs = $state<Tx[]>([])
  let loading = $state(true)

  onMount(async () => {
    try {
      const data = await api.get<{ transactions: Tx[] }>('/api/client/transactions')
      txs = data.transactions
    } catch {}
    loading = false
  })

  function isEarned(type: string) {
    return type === 'ADD_POINTS' || type === 'ADD_MEAL_VOUCHER'
  }

  function label(tx: Tx) {
    if (tx.rewardTitle) return tx.rewardTitle
    return isEarned(tx.type) ? t('transactions.earned') : t('transactions.spent')
  }

  function formatTime(ts: number) {
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return ''
    }
  }

  function formatAmount(tx: Tx) {
    if (tx.balanceType === 'meal_voucher') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(tx.amount)
    }
    return String(tx.amount)
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="mb-6 animate-fade-in">
    <h1 class="text-xl font-bold">{t('transactions.title')}</h1>
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each [1, 2, 3] as _}
        <div class="card p-4 animate-pulse">
          <div class="h-4 bg-surface-container-high rounded w-1/3 mb-2"></div>
          <div class="h-3 bg-surface-container-high rounded w-1/2"></div>
        </div>
      {/each}
    </div>
  {:else if txs.length === 0}
    <div class="card p-8 text-center">
      <p class="text-sm text-on-surface-variant">{t('transactions.empty')}</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each txs as tx, i (tx.id)}
        <div class="card p-4 animate-slide-up" style="animation-delay: {i * 40}ms">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 {isEarned(tx.type) ? 'bg-green-100' : 'bg-red-100'}">
              {#if isEarned(tx.type)}
                <ArrowUpRight size={18} class="text-green-700" />
              {:else}
                <ArrowDownLeft size={18} class="text-red-700" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold truncate">{tx.merchantName}</p>
                <span class="text-[10px] text-on-surface-variant shrink-0">{formatTime(tx.createdAt)}</span>
              </div>
              <p class="text-xs text-on-surface-variant mt-0.5 truncate flex items-center gap-1">
                {#if tx.rewardTitle}<Gift size={12} class="shrink-0" />{/if}
                {label(tx)}
              </p>
              <p class="text-xs mt-1 {isEarned(tx.type) ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}">
                {isEarned(tx.type) ? '+' : '-'}{formatAmount(tx)}{tx.balanceType === 'fidelity' ? ' ' + t('transactions.fidelity') : ' TND ' + t('transactions.meal')}
              </p>
            </div>
          </div>
        </div>
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
