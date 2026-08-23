<script lang="ts">
  import { navigate } from '../stores/router.svelte'
  import { t } from '../lib/i18n.svelte'
  import { fetchNotifications, markRead, markAllRead, notif } from '../stores/notifications.svelte'
  import type { AppNotification, NotificationType } from '../lib/types'
  import { Zap, Coffee, Ticket, ArrowDownCircle, ArrowUpCircle, Bell } from '@lucide/svelte'

  let items = $state<AppNotification[]>([])
  let loading = $state(true)

  const iconFor: Record<NotificationType, any> = {
    points_earned: Zap,
    meal_earned: Coffee,
    reward_redeemed: Ticket,
    points_spent: ArrowDownCircle,
    meal_spent: ArrowUpCircle,
  }

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts
    const m = Math.floor(diff / 60000)
    if (m < 1) return t('time.just_now')
    if (m < 60) return `${m}${t('time.min')}`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}${t('time.h')}`
    const d = Math.floor(h / 24)
    return `${d}${t('time.d')}`
  }

  function titleFor(n: AppNotification): string {
    const merchant = n.merchantName ?? 'Fidelito'
    switch (n.type) {
      case 'points_earned':
        return t('notifications.points_earned', { merchant, amount: String(n.data.amount ?? 1) })
      case 'meal_earned':
        return t('notifications.meal_earned', { merchant, amount: String(n.data.amount ?? 1) })
      case 'points_spent':
        return t('notifications.points_spent', { merchant, amount: String(n.data.amount ?? 1) })
      case 'meal_spent':
        return t('notifications.meal_spent', { merchant, amount: String(n.data.amount ?? 1) })
      case 'reward_redeemed':
        return t('notifications.reward_redeemed', { merchant })
    }
  }

  async function load() {
    loading = true
    try {
      const res = await fetchNotifications(50)
      items = res.notifications
    } finally {
      loading = false
    }
  }

  $effect(() => {
    load()
  })

  async function onItem(n: AppNotification) {
    if (!n.isRead) {
      await markRead(n.id)
      n.isRead = true
    }
  }

  async function onMarkAll() {
    await markAllRead()
    items = items.map((i) => ({ ...i, isRead: true }))
  }
</script>

  <div class="screen">
    <div class="screen-header">
      <button class="icon-btn" onclick={() => navigate('home')} aria-label="Back">
        <Coffee size={20} />
      </button>
      <h1 class="screen-title">{t('nav.notifications')}</h1>
      {#if notif.unreadCount > 0}
        <button class="text-sm text-primary font-medium" onclick={onMarkAll}>
          {t('notifications.mark_all')}
        </button>
      {:else}
        <span></span>
      {/if}
    </div>

    {#if loading}
      <p class="empty-state">{t('common.loading')}</p>
    {:else if items.length === 0}
      <div class="empty-state">
        <Bell size={40} class="opacity-40" />
        <p>{t('notifications.empty')}</p>
      </div>
    {:else}
      <ul class="divide-y divide-outline">
        {#each items as n (n.id)}
          {@const C = iconFor[n.type]}
          <li>
            <button
              class="w-full flex items-start gap-3 px-4 py-3 text-start"
              class:bg-surface-container={!n.isRead}
              onclick={() => onItem(n)}
            >
              <span class="mt-1 shrink-0" class:text-primary={!n.isRead}>
                <C size={20} />
              </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-on-surface">{titleFor(n)}</span>
              <span class="block text-xs text-on-surface-variant mt-0.5">{timeAgo(n.createdAt)}</span>
            </span>
            {#if !n.isRead}
              <span class="mt-2 w-2 h-2 rounded-full bg-primary shrink-0"></span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
