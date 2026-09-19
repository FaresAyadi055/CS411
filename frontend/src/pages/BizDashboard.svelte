<script lang="ts">
  import { onMount } from 'svelte'
import {
    TrendingUp, TrendingDown, Minus, Users, Gift, Coins,
    Repeat2, Clock, RefreshCw, ArrowUpRight, Trophy,
    AlertCircle, Sparkles, X,
  } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import api, { invalidateCache } from '../lib/api'
  import { showToast } from '../stores/toast.svelte'
  import type { DashboardStats } from '../lib/types'
  import { Line, Bar } from 'svelte-chartjs'
  import {
    Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
    Filler, Tooltip, Legend,
  } from 'chart.js'

  Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

  let stats = $state<DashboardStats | null>(null)
  let loading = $state(true)
  let showTopCustomersModal = $state(false)
  let showCustomersModal = $state(false)
  let customersList = $state<any[]>([])
  let customersLoading = $state(false)
  let customersCursor = $state<number | null>(null)
  let refreshing = $state(false)
  let loadError = $state(false)
  let period = $state<7 | 14 | 30>(14)
  let mounted = $state(false)

  const PRIMARY = '#006948'
  const PRIMARY_SOFT = 'rgba(0, 105, 72, 0.14)'
  const AMBER = '#8a6d00'
  const AMBER_SOFT = 'rgba(138, 109, 0, 0.14)'

  const RING_R = 84
  const RING_C = 2 * Math.PI * RING_R
  let ringDash = $state(RING_C)

  async function loadData(days: number, showSpinner = false) {
    if (showSpinner) refreshing = true
    else loading = true
    loadError = false
    try {
      const data = await api.get<{ dashboard: DashboardStats }>(`/api/business/dashboard?days=${days}`)
      stats = data.dashboard
    } catch {
      loadError = true
    }
    loading = false
    refreshing = false
  }

  onMount(async () => {
    await loadData(period)
    mounted = true
  })

  async function loadCustomers(loadMore = false) {
    if (customersLoading) return
    customersLoading = true
    try {
      const url = `/api/business/customers?limit=20${customersCursor ? `&cursor=${customersCursor}` : ''}`
      const data = await api.get<{ customers: any[] }>(url)
      if (loadMore) {
        customersList = [...customersList, ...data.customers]
      } else {
        customersList = data.customers
      }
      if (data.customers.length > 0) {
        customersCursor = data.customers[data.customers.length - 1].lastVisitAt
      }
    } catch (e) {
      console.error(e)
    }
    customersLoading = false
  }

  function openCustomersModal() {
    showCustomersModal = true
    if (customersList.length === 0) loadCustomers()
  }

  async function changePeriod(p: 7 | 14 | 30) {
    if (p === period) return
    period = p
    await loadData(p)
  }

  async function refresh() {
    invalidateCache('/api/business/dashboard')
    await loadData(period, true)
    if (!loadError) showToast('success', t('dashboard.refreshed'))
  }

  // ---------- Count-up number action ----------
  function countUp(node: HTMLElement, value: number) {
    let frame: number
    let current = 0
    function run(from: number, to: number, duration = 900) {
      const start = performance.now()
      function tick(now: number) {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        current = from + (to - from) * eased
        node.textContent = Math.round(current).toLocaleString()
        if (progress < 1) frame = requestAnimationFrame(tick)
        else current = to
      }
      frame = requestAnimationFrame(tick)
    }
    run(0, value)
    return {
      update(newValue: number) {
        cancelAnimationFrame(frame)
        run(current, newValue)
      },
      destroy() {
        cancelAnimationFrame(frame)
      },
    }
  }

  // ---------- Derived data ----------
  const growthPct = $derived.by(() => {
    if (!stats) return 0
    const { transactionsThisWeek: cur, transactionsPrevWeek: prev } = stats
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  })

  const givenPct = $derived.by(() => {
    if (!stats || stats.pointsFunded <= 0) return 0
    return Math.min(100, Math.round((stats.pointsGiven / stats.pointsFunded) * 100))
  })

  const remainingPoints = $derived(stats ? Math.max(0, stats.pointsBalance) : 0)

  $effect(() => {
    if (stats && mounted) {
      const target = RING_C * (1 - givenPct / 100)
      requestAnimationFrame(() => {
        ringDash = target
      })
    }
  })

  const maxRewardRedemptions = $derived(
    stats && stats.topRewards.length ? Math.max(...stats.topRewards.map((r) => r.redemptions)) : 1,
  )
  const maxWeekdayCount = $derived(
    stats && stats.weekdayDistribution.length ? Math.max(...stats.weekdayDistribution.map((d) => d.count), 1) : 1,
  )
  const peakHour = $derived.by(() => {
    if (!stats || !stats.hourlyDistribution.length) return null
    return stats.hourlyDistribution.reduce((a, b) => (b.count > a.count ? b : a))
  })

  const weekdayShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const lineChartData = $derived(stats ? {
    labels: stats.dailyActivity.map((d) => {
      const dt = new Date(d.date + 'T00:00:00')
      return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    }),
    datasets: [
      {
        label: t('dashboard.earned'),
        data: stats.dailyActivity.map((d) => d.earned),
        borderColor: PRIMARY,
        backgroundColor: PRIMARY_SOFT,
        pointBackgroundColor: PRIMARY,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
      },
      {
        label: t('dashboard.redeemed'),
        data: stats.dailyActivity.map((d) => d.redeemed),
        borderColor: AMBER,
        backgroundColor: AMBER_SOFT,
        pointBackgroundColor: AMBER,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
      },
    ],
  } : { labels: [], datasets: [] })

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    animation: { duration: 900, easing: 'easeOutCubic' as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#131b2e',
        titleColor: '#eef0ff',
        bodyColor: '#eef0ff',
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: { display: true, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
      y: { display: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, precision: 0 } },
    },
  }

  const hourlyChartData = $derived(stats ? {
    labels: stats.hourlyDistribution.map((h) => (h.hour % 3 === 0 ? `${h.hour}h` : '')),
    datasets: [
      {
        label: t('dashboard.busiest_hours'),
        data: stats.hourlyDistribution.map((h) => h.count),
        backgroundColor: stats.hourlyDistribution.map((h) =>
          peakHour && h.hour === peakHour.hour ? PRIMARY : 'rgba(0, 105, 72, 0.28)',
        ),
        borderRadius: 4,
        maxBarThickness: 10,
      },
    ],
  } : { labels: [], datasets: [] })

  const hourlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutCubic' as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#131b2e',
        titleColor: '#eef0ff',
        bodyColor: '#eef0ff',
        padding: 8,
        cornerRadius: 8,
        callbacks: {
          title: (items: any[]) => `${items[0].dataIndex}:00`,
        },
      },
    },
    scales: {
      x: { display: true, grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { display: false, beginAtZero: true },
    },
  }

  function initials(first?: string | null, last?: string | null) {
    return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?'
  }

  function relativeTime(ts: number | string) {
    const date = typeof ts === 'string' ? new Date(ts) : new Date(ts)
    const diffMs = Date.now() - date.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return t('dashboard.just_now')
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return date.toLocaleDateString()
  }

  function isEarnType(type: string) {
    return type === 'ADD_POINTS'
  }

  function txLabel(tx: DashboardStats['recentTransactions'][number]) {
    if (tx.rewardTitle) return tx.rewardTitle
    return t('dashboard.points')
  }

  function formatAmount(tx: DashboardStats['recentTransactions'][number]) {
    const sign = isEarnType(tx.type) ? '+' : '-'
    return `${sign}${tx.amount}`
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg lg:max-w-6xl mx-auto">
  <div class="mb-6 animate-fade-in flex items-start justify-between gap-3">
    <div>
      <h1 class="text-xl font-bold">{t('dashboard.title')}</h1>
      <p class="text-xs text-on-surface-variant mt-0.5">{t('dashboard.subtitle')}</p>
    </div>
    {#if !loading}
      <button
        onclick={refresh}
        disabled={refreshing}
        class="p-2 rounded-full border border-outline text-on-surface-variant hover:text-primary hover:border-primary transition-colors shrink-0 disabled:opacity-50"
        aria-label={t('dashboard.refresh')}
      >
        <RefreshCw size={16} class={refreshing ? 'animate-spin' : ''} />
      </button>
    {/if}
  </div>

  {#if loading}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {#each [1, 2, 3, 4] as _}
        <div class="card p-4">
          <div class="h-4 w-4 rounded skeleton-shimmer mb-3"></div>
          <div class="h-7 bg-surface-container-high rounded w-16 mb-2 skeleton-shimmer"></div>
          <div class="h-3 bg-surface-container-high rounded w-20 skeleton-shimmer"></div>
        </div>
      {/each}
    </div>
    <div class="card p-4 mb-6 h-48 skeleton-shimmer"></div>
    <div class="card p-4 mb-6 h-32 skeleton-shimmer"></div>
  {:else if loadError}
    <div class="card p-8 text-center animate-fade-in">
      <AlertCircle size={28} class="text-lost-text mx-auto mb-3" />
      <p class="text-sm text-on-surface-variant mb-4">{t('dashboard.load_error')}</p>
      <button onclick={() => loadData(period)} class="btn btn-primary !text-xs mx-auto">{t('dashboard.retry')}</button>
    </div>
  {:else if stats}
    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
      <div class="card p-4 animate-slide-up hover-lift" style="animation-delay: 0ms">
        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Coins size={16} class="text-primary" />
        </div>
        <p class="text-2xl font-bold tabular-nums" use:countUp={stats.totalPointsAdded}>0</p>
        <p class="text-xs text-on-surface-variant mt-0.5">{t('dashboard.points_issued')}</p>
      </div>
      <div class="card p-4 animate-slide-up hover-lift" style="animation-delay: 60ms">
        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Users size={16} class="text-primary" />
        </div>
        <p class="text-2xl font-bold tabular-nums" use:countUp={stats.uniqueCustomers}>0</p>
        <div class="flex items-center justify-between mt-1">
          <p class="text-xs text-on-surface-variant">{t('dashboard.customers')}</p>
          <button class="text-xs text-primary font-medium" onclick={openCustomersModal}>{t('common.view')}</button>
        </div>
      </div>
      <div class="card p-4 animate-slide-up hover-lift" style="animation-delay: 120ms">
        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Gift size={16} class="text-primary" />
        </div>
        <p class="text-2xl font-bold tabular-nums" use:countUp={stats.redemptionsCount}>0</p>
        <p class="text-xs text-on-surface-variant mt-0.5">{t('dashboard.redemptions')}</p>
      </div>
    </div>

    <!-- Weekly growth strip -->
    <div class="card p-4 mb-4 animate-slide-up flex items-center gap-3" style="animation-delay: 220ms">
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        class:bg-found-bg={growthPct > 0}
        class:bg-lost-bg={growthPct < 0}
        class:bg-surface-container-high={growthPct === 0}
      >
        {#if growthPct > 0}
          <TrendingUp size={18} class="text-found-text" />
        {:else if growthPct < 0}
          <TrendingDown size={18} class="text-lost-text" />
        {:else}
          <Minus size={18} class="text-on-surface-variant" />
        {/if}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold">
          {stats.transactionsThisWeek} {t('dashboard.stamps_week').toLowerCase()}
          <span
            class="font-bold"
            class:text-found-text={growthPct > 0}
            class:text-lost-text={growthPct < 0}
            class:text-on-surface-variant={growthPct === 0}
          >
            {growthPct === 0 ? t('dashboard.no_change') : `${growthPct > 0 ? '+' : ''}${growthPct}%`}
          </span>
        </p>
        <p class="text-xs text-on-surface-variant">{t('dashboard.vs_last_week')}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-lg font-bold tabular-nums">{stats.transactionsToday}</p>
        <p class="text-[11px] text-on-surface-variant">{t('dashboard.stamps_today')}</p>
      </div>
    </div>

    <!-- Points balance + monthly cap ring -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <div class="card p-4 animate-slide-up" style="animation-delay: 260ms">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold">{t('points.balance')}</h2>
        <span class="text-xs font-bold" class:text-lost-text={givenPct >= 100} class:text-primary={givenPct < 100}>
          {givenPct}% {t('points.given')}
        </span>
      </div>
      <div class="flex items-center gap-4">
        <div class="relative w-[120px] h-[120px] shrink-0">
          <svg viewBox="0 0 200 200" class="w-full h-full -rotate-90">
            <circle cx="100" cy="100" r={RING_R} fill="none" stroke="var(--color-outline)" stroke-width="16" />
            <circle
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke={givenPct >= 100 ? 'var(--color-lost-text)' : 'var(--color-primary)'}
              stroke-width="16"
              stroke-linecap="round"
              stroke-dasharray={RING_C}
              stroke-dashoffset={ringDash}
              style="transition: stroke-dashoffset 1s ease-out;"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xl font-bold tabular-nums">{remainingPoints.toLocaleString()}</span>
            <span class="text-[10px] text-on-surface-variant">{t('points.balance')}</span>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-surface-container-low rounded-lg p-2 text-center">
              <p class="text-sm font-bold text-lost-text tabular-nums">{stats.pointsGiven.toLocaleString()}</p>
              <p class="text-[10px] text-on-surface-variant">{t('points.given')}</p>
            </div>
            <div class="bg-surface-container-low rounded-lg p-2 text-center">
              <p class="text-sm font-bold text-primary tabular-nums">{stats.pointsFunded.toLocaleString()}</p>
              <p class="text-[10px] text-on-surface-variant">{t('points.funded')}</p>
            </div>
          </div>
          <p class="text-[11px] text-on-surface-variant mt-2 text-center">
            {t('points.given_of', { given: stats.pointsGiven.toLocaleString(), funded: stats.pointsFunded.toLocaleString() })}
          </p>
        </div>
      </div>
    </div>

    <!-- Activity chart -->
    <div class="card p-4 animate-slide-up" style="animation-delay: 300ms">
      <div class="flex items-center justify-between mb-1">
        <div>
          <h2 class="text-sm font-semibold">{t('dashboard.activity_overview')}</h2>
          <p class="text-xs text-on-surface-variant">{t('dashboard.activity_desc')}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          {#each [7, 14, 30] as p}
            <button
              onclick={() => changePeriod(p as 7 | 14 | 30)}
              class="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              class:bg-primary={period === p}
              class:text-on-primary={period === p}
              class:text-on-surface-variant={period !== p}
            >{t(`dashboard.period_${p}d`)}</button>
          {/each}
        </div>
      </div>
      <div class="flex items-center gap-4 mt-2 mb-1">
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" style="background:{PRIMARY}"></span>
          <span class="text-[11px] text-on-surface-variant">{t('dashboard.earned')}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" style="background:{AMBER}"></span>
          <span class="text-[11px] text-on-surface-variant">{t('dashboard.redeemed')}</span>
        </div>
      </div>
      <div class="h-44 mt-2">
        {#key period}
          <Line data={lineChartData} options={lineChartOptions} />
        {/key}
      </div>
    </div>
    </div>

    <!-- Busiest hours + days -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <div class="card p-4 animate-slide-up" style="animation-delay: 340ms">
      <h2 class="text-sm font-semibold mb-0.5">{t('dashboard.busiest_hours')}</h2>
      <p class="text-xs text-on-surface-variant mb-2">{t('dashboard.busiest_hours_desc')}</p>
      <div class="h-28">
        <Bar data={hourlyChartData} options={hourlyChartOptions} />
      </div>

      <h2 class="text-sm font-semibold mt-5 mb-3">{t('dashboard.busiest_days')}</h2>
      <div class="flex items-end justify-between gap-2 h-20">
        {#each stats.weekdayDistribution as d, i}
          {@const pct = Math.max(4, Math.round((d.count / maxWeekdayCount) * 100))}
          <div class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div class="w-full flex flex-col items-center justify-end h-full">
              <div
                class="w-full max-w-[22px] rounded-t-md transition-all duration-700 ease-out"
                class:bg-primary={d.count === maxWeekdayCount && d.count > 0}
                class:bg-primary-container={!(d.count === maxWeekdayCount && d.count > 0)}
                style="height: {mounted ? pct : 0}%; transition-delay: {i * 40}ms"
                title={String(d.count)}
              ></div>
            </div>
            <span class="text-[10px] text-on-surface-variant font-medium">{weekdayShort[d.day]}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Top rewards -->
    <div>
    <h2 class="text-sm font-semibold mb-3 flex items-center gap-1.5"><Sparkles size={14} class="text-primary" />{t('dashboard.top_rewards')}</h2>
    {#if stats.topRewards.length > 0}
      <div class="card p-3 space-y-3">
        {#each stats.topRewards as r, i}
          <div class="animate-slide-up" style="animation-delay: {380 + i * 50}ms">
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-medium truncate">{r.title}</p>
              <span class="text-xs font-semibold text-on-surface-variant shrink-0 ml-2">{r.redemptions}</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div
                class="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style="width: {mounted ? Math.max(6, Math.round((r.redemptions / maxRewardRedemptions) * 100)) : 0}%; transition-delay: {i * 60}ms"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="card p-6 text-center">
        <p class="text-sm text-on-surface-variant">{t('dashboard.no_rewards')}</p>
      </div>
    {/if}
    </div>
    </div>

    <!-- Top customers -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <div>
    <h2 class="text-sm font-semibold mb-3 flex items-center gap-1.5"><Trophy size={14} class="text-primary" />{t('dashboard.top_customers')}</h2>
    {#if stats.topCustomers.length > 0}
      <div class="card divide-y divide-outline">
        {#each stats.topCustomers.slice(0, 5) as c, i}
          <div class="flex items-center gap-3 p-3 animate-slide-up" style="animation-delay: {420 + i * 50}ms">
            <div class="w-6 text-center shrink-0">
              {#if i < 3}
                <span class="text-base" title={t('dashboard.rank')}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
              {:else}
                <span class="text-xs font-semibold text-on-surface-variant">{i + 1}</span>
              {/if}
            </div>
            <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {initials(c.firstName, c.lastName)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{c.firstName || ''} {c.lastName || ''}</p>
              <p class="text-xs text-on-surface-variant">{c.lifetimePoints} {t('dashboard.points')}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-semibold text-primary">{c.fidelityPoints}</p>
            </div>
          </div>
        {/each}
      </div>
      {#if stats.topCustomers.length > 5}
        <button class="text-sm text-primary font-medium block w-full text-center" onclick={() => showTopCustomersModal = true}>
          {t('dashboard.view_all')}
        </button>
      {/if}
    {:else}
      <div class="card p-6 text-center">
        <p class="text-sm text-on-surface-variant">{t('dashboard.no_customers')}</p>
      </div>
    {/if}
    </div>

    <!-- Recent Activity -->
    <div>
    <h2 class="text-sm font-semibold mb-3">{t('dashboard.recent_activity')}</h2>
    {#if stats.recentTransactions.length > 0}
      <div class="card divide-y divide-outline">
        {#each stats.recentTransactions.slice(0, 8) as tx, i}
          <div class="flex items-center gap-3 p-3 animate-slide-up" style="animation-delay: {460 + i * 40}ms">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              class:bg-found-bg={isEarnType(tx.type)}
              class:bg-lost-bg={!isEarnType(tx.type)}
            >
              {#if isEarnType(tx.type)}
                <ArrowUpRight size={16} class="text-found-text" />
              {:else}
                <Repeat2 size={16} class="text-lost-text" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{tx.customerName || 'Customer'}</p>
              <p class="text-xs text-on-surface-variant truncate">{txLabel(tx)}</p>
            </div>
            <div class="text-right shrink-0">
              <span
                class="text-sm font-semibold block"
                class:text-found-text={isEarnType(tx.type)}
                class:text-lost-text={!isEarnType(tx.type)}
              >
                {formatAmount(tx)}
              </span>
              <span class="text-[10px] text-on-surface-variant">{relativeTime(tx.createdAt)}</span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="card p-6 text-center">
        <Clock size={22} class="text-on-surface-variant mx-auto mb-2" />
        <p class="text-sm font-medium">{t('dashboard.no_activity')}</p>
        <p class="text-xs text-on-surface-variant mt-1">{t('dashboard.no_activity_desc')}</p>
      </div>
    {/if}
    </div>
    </div>
  {/if}

  {#if showTopCustomersModal}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="card bg-surface w-full max-w-lg max-h-[80vh] flex flex-col p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{t('dashboard.top_customers')}</h2>
          <button class="text-on-surface-variant" onclick={() => showTopCustomersModal = false} aria-label={t('common.dismiss')}>
             <X size={18} />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto divide-y divide-outline">
          {#each (stats?.topCustomers ?? []) as c, i}
            <div class="flex items-center gap-3 p-3">
              <div class="w-6 text-center shrink-0">
                {#if i < 3}
                  <span class="text-base" title={t('dashboard.rank')}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                {:else}
                  <span class="text-xs font-semibold text-on-surface-variant">{i + 1}</span>
                {/if}
              </div>
              <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {initials(c.firstName, c.lastName)}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{c.firstName || ''} {c.lastName || ''}</p>
                <p class="text-xs text-on-surface-variant">{c.lifetimePoints} {t('dashboard.points')}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-semibold text-primary">{c.fidelityPoints}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if showCustomersModal}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="card bg-surface w-full max-w-lg max-h-[80vh] flex flex-col p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{t('dashboard.customers')}</h2>
          <button class="text-on-surface-variant" onclick={() => showCustomersModal = false} aria-label={t('common.dismiss')}>
             <X size={18} />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto divide-y divide-outline">
           {#each customersList as c}
            <div class="flex items-center justify-between py-3">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{c.firstName || ''} {c.lastName || ''}</p>
                <p class="text-xs text-on-surface-variant">{c.email}</p>
                {#if c.phone}
                  <p class="text-xs text-on-surface-variant">{c.phone}</p>
                {/if}
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-semibold text-primary">{c.fidelityPoints} {t('dashboard.points')}</p>
              </div>
            </div>
          {/each}
          {#if customersLoading}
            <p class="text-sm text-center py-4">{t('common.loading')}</p>
          {:else if customersList.length > 0}
            <button class="w-full text-sm text-primary py-3" onclick={() => loadCustomers(true)}>
              {t('common.load_more')}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</main>
