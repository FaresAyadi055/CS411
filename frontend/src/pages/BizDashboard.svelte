<script lang="ts">
  import { onMount } from 'svelte'
  import { LayoutDashboard, TrendingUp, Users, Gift, Zap, Calendar, Star } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'
  import type { DashboardStats } from '../lib/types'

  let stats = $state<DashboardStats | null>(null)
  let loading = $state(true)

  onMount(async () => {
    try {
      const data = await api.get<{ dashboard: DashboardStats }>('/api/business/dashboard')
      stats = data.dashboard
    } catch {}
    loading = false
  })
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="mb-6 animate-fade-in">
    <h1 class="text-xl font-bold">{t('dashboard.title')}</h1>
  </div>

  {#if loading}
    <div class="grid grid-cols-2 gap-3">
      {#each [1, 2, 3, 4] as _}
        <div class="card p-4 animate-pulse">
          <div class="h-8 bg-surface-container-high rounded w-16 mb-2"></div>
          <div class="h-3 bg-surface-container-high rounded w-20"></div>
        </div>
      {/each}
    </div>
  {:else if stats}
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="card p-4 animate-slide-up" style="animation-delay: 0ms">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap size={16} class="text-primary" />
          </div>
        </div>
        <p class="text-2xl font-bold">{stats.totalStamps}</p>
        <p class="text-xs text-on-surface-variant">{t('dashboard.total_stamps')}</p>
      </div>

      <div class="card p-4 animate-slide-up" style="animation-delay: 50ms">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users size={16} class="text-primary" />
          </div>
        </div>
        <p class="text-2xl font-bold">{stats.uniqueCustomers}</p>
        <p class="text-xs text-on-surface-variant">{t('dashboard.customers')}</p>
      </div>

      <div class="card p-4 animate-slide-up" style="animation-delay: 100ms">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Gift size={16} class="text-primary" />
          </div>
        </div>
        <p class="text-2xl font-bold">{stats.totalRewardsRedeemed}</p>
        <p class="text-xs text-on-surface-variant">{t('dashboard.rewards_redeemed')}</p>
      </div>

      <div class="card p-4 animate-slide-up" style="animation-delay: 150ms">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp size={16} class="text-primary" />
          </div>
        </div>
        <p class="text-2xl font-bold">{stats.pointsUsedMonth}<span class="text-sm text-on-surface-variant">/{stats.monthlyPointCap}</span></p>
        <p class="text-xs text-on-surface-variant">{t('dashboard.points_used')}</p>
        <div class="mt-2 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-500"
            style="width: {Math.min((stats.pointsUsedMonth / stats.monthlyPointCap) * 100, 100)}%"
          ></div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="card p-3 text-center animate-slide-up" style="animation-delay: 200ms">
        <Calendar size={16} class="text-primary mx-auto mb-1" />
        <p class="text-lg font-bold">{stats.stampsToday}</p>
        <p class="text-[10px] text-on-surface-variant">{t('dashboard.stamps_today')}</p>
      </div>
      <div class="card p-3 text-center animate-slide-up" style="animation-delay: 250ms">
        <Calendar size={16} class="text-primary mx-auto mb-1" />
        <p class="text-lg font-bold">{stats.stampsThisWeek}</p>
        <p class="text-[10px] text-on-surface-variant">{t('dashboard.stamps_week')}</p>
      </div>
      <div class="card p-3 text-center animate-slide-up" style="animation-delay: 300ms">
        <Calendar size={16} class="text-primary mx-auto mb-1" />
        <p class="text-lg font-bold">{stats.stampsThisMonth}</p>
        <p class="text-[10px] text-on-surface-variant">{t('dashboard.stamps_month')}</p>
      </div>
    </div>

    {#if stats.topCustomers.length > 0}
      <h2 class="text-sm font-semibold mb-3">{t('dashboard.top_customers')}</h2>
      <div class="card divide-y divide-outline mb-6">
        {#each stats.topCustomers as customer, i}
          <div class="flex items-center gap-3 p-3 animate-slide-up" style="animation-delay: {350 + i * 50}ms">
            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span class="text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{customer.firstName || ''} {customer.lastName || 'Customer'}</p>
              <p class="text-xs text-on-surface-variant">{customer.lifetimeStamps} lifetime stamps</p>
            </div>
            <div class="flex items-center gap-1 text-xs font-semibold text-primary">
              <Star size={12} />
              {customer.currentStamps}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if stats.recentTransactions.length > 0}
      <h2 class="text-sm font-semibold mb-3">{t('dashboard.recent_activity')}</h2>
      <div class="card divide-y divide-outline">
        {#each stats.recentTransactions.slice(0, 10) as tx, i}
          <div class="flex items-center gap-3 p-3 animate-slide-up" style="animation-delay: {500 + i * 30}ms">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              class:bg-found-bg={tx.type === 'EARN_STAMP'}
              class:bg-lost-bg={tx.type === 'REDEEM_REWARD'}
            >
              {#if tx.type === 'EARN_STAMP'}
                <Zap size={14} class="text-found-text" />
              {:else}
                <Gift size={14} class="text-lost-text" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{tx.customerName || 'Customer'}</p>
              <p class="text-xs text-on-surface-variant">{tx.type === 'EARN_STAMP' ? 'Stamp' : 'Redeem'}</p>
            </div>
            <span class="text-sm font-semibold" class:text-found-text={tx.type === 'EARN_STAMP'} class:text-lost-text={tx.type === 'REDEEM_REWARD'}>
              {tx.type === 'EARN_STAMP' ? '+' : ''}{tx.stampsCount}
            </span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="card p-6 text-center">
        <p class="text-sm text-on-surface-variant">{t('dashboard.no_activity')}</p>
      </div>
    {/if}
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
