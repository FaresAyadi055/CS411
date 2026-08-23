<script lang="ts">
  import { onMount } from 'svelte'
  import { LayoutDashboard, TrendingUp, Users, Gift, Zap, Calendar, Star } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'
  import type { DashboardStats } from '../lib/types'
  import { Line } from 'svelte-chartjs'
  import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

  Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

  let stats = $state<DashboardStats | null>(null)
  let loading = $state(true)

  onMount(async () => {
    try {
      const data = await api.get<{ dashboard: DashboardStats }>('/api/business/dashboard')
      stats = data.dashboard
    } catch {}
    loading = false
  })

  let chartData = $derived(stats ? {
    labels: stats.dailyTransactions.map(d => d.date),
    datasets: [{
      label: 'Stamps',
      data: stats.dailyTransactions.map(d => d.count),
      borderColor: '#e8def8', // Matches primary theme accent
      backgroundColor: '#e8def8',
      tension: 0.4
    }]
  } : { labels: [], datasets: [] })

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } }
  }
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
    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="card p-4 animate-slide-up">
        <p class="text-2xl font-bold">{stats.totalStamps}</p>
        <p class="text-xs text-on-surface-variant">{t('dashboard.total_stamps')}</p>
      </div>
      <div class="card p-4 animate-slide-up">
        <p class="text-2xl font-bold">{stats.uniqueCustomers}</p>
        <p class="text-xs text-on-surface-variant">{t('dashboard.customers')}</p>
      </div>
    </div>

    <!-- Chart -->
    <div class="card p-4 mb-6 animate-slide-up">
      <h2 class="text-sm font-semibold mb-3">Activity (Last 7 Days)</h2>
      <div class="h-40">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>

    <!-- Recent Activity -->
    {#if stats.recentTransactions.length > 0}
      <h2 class="text-sm font-semibold mb-3">{t('dashboard.recent_activity')}</h2>
      <div class="card divide-y divide-outline">
        {#each stats.recentTransactions.slice(0, 5) as tx, i}
          <div class="flex items-center gap-3 p-3 animate-slide-up">
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
    {/if}
  {/if}
</main>
