<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { Users, ShieldCheck, UserPlus, ShieldAlert, ChevronLeft, ChevronRight } from '@lucide/svelte'
  import { t } from '../../lib/i18n.svelte'
  import { navigate } from '../../stores/router.svelte'
  import { showToast } from '../../stores/toast.svelte'
  import api, { invalidateCache } from '../../lib/api'
  import type { AdminStats, AdminUser, RateLimitItem } from '../../lib/types'

  let tab = $state('overview')
  let loading = $state(true)
  let loadError = $state(false)
  let refreshing = $state(false)

  let stats = $state<AdminStats | null>(null)
  let users = $state<AdminUser[]>([])
  let rateLimits = $state<RateLimitItem[]>([])

  let userPage = $state(0)
  let limitPage = $state(0)
  const perPage = 20
  const userPageCount = $derived(Math.max(1, Math.ceil(users.length / perPage)))
  const paginatedUsers = $derived(users.slice(userPage * perPage, (userPage + 1) * perPage))
  const limitPageCount = $derived(Math.max(1, Math.ceil(rateLimits.length / perPage)))
  const paginatedLimits = $derived(rateLimits.slice(limitPage * perPage, (limitPage + 1) * perPage))

  $effect(() => { if (userPage * perPage >= users.length && userPage > 0) userPage = 0 })
  $effect(() => { if (limitPage * perPage >= rateLimits.length && limitPage > 0) limitPage = 0 })

  async function loadData() {
    loading = true
    loadError = false
    try {
      const [statsData, usersData, limitsData] = await Promise.all([
        api.get<AdminStats>('/api/admin/stats'),
        api.get<{ users: AdminUser[] }>('/api/admin/users'),
        api.get<{ items: RateLimitItem[] }>('/api/admin/rate-limits'),
      ])
      stats = statsData
      users = usersData.users
      rateLimits = limitsData.items
    } catch (e) {
      console.error(e)
      loadError = true
    }
    loading = false
  }

  onMount(async () => {
    await loadData()
    await tick()
  })

  function back() { navigate('home') }

  function userLabel(u: AdminUser) {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
  }

  async function toggleRole(u: AdminUser) {
    const nextRole = u.role === 'admin' ? 'user' : 'admin'
    try {
      await api.patch<{ user: AdminUser }>(`/api/admin/users/${u.id}`, { role: nextRole })
      u.role = nextRole
      showToast('success', nextRole === 'admin' ? t('admin.role.admin') : t('admin.role.user'))
    } catch {
      showToast('error', t('error.generic'))
    }
  }

  async function deleteUser(u: AdminUser) {
    if (!confirm(t('admin.delete.confirm'))) return
    try {
      await api.delete(`/api/admin/users/${u.id}`)
      users = users.filter(x => x.id !== u.id)
      showToast('success', t('common.saved'))
    } catch {
      showToast('error', t('error.generic'))
    }
  }

  async function refreshData() {
    refreshing = true
    invalidateCache()
    try {
      const [statsData, usersData, limitsData] = await Promise.all([
        api.get<AdminStats>('/api/admin/stats'),
        api.get<{ users: AdminUser[] }>('/api/admin/users'),
        api.get<{ items: RateLimitItem[] }>('/api/admin/rate-limits'),
      ])
      stats = statsData
      users = usersData.users
      rateLimits = limitsData.items
    } catch (e) {
      console.error(e)
      loadError = true
    }
    refreshing = false
  }

  const statCards = [
    { icon: Users, key: 'users', value: () => stats?.users ?? 0 },
    { icon: ShieldCheck, key: 'admins', value: () => stats?.admins ?? 0 },
    { icon: UserPlus, key: 'new24h', value: () => stats?.newUsers24h ?? 0 },
    { icon: ShieldAlert, key: 'rate24h', value: () => stats?.rateLimited24h ?? 0 },
  ]
</script>

<main class="px-4 py-4">
  <div class="flex items-center gap-2 mb-4">
    <button onclick={back} class="text-on-surface-variant"><ChevronLeft size={20} /></button>
    <h1 class="text-xl font-bold">{t('admin.title')}</h1>
  </div>

  <div class="flex gap-2 mb-4 overflow-x-auto">
    {#each ['overview', 'users', 'rate.limits'] as tabKey}
      <button
        onclick={() => tab = tabKey === 'rate.limits' ? 'rate-limits' : tabKey}
        class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
        class:bg-primary={tab === (tabKey === 'rate.limits' ? 'rate-limits' : tabKey)}
        class:text-on-primary={tab === (tabKey === 'rate.limits' ? 'rate-limits' : tabKey)}
        class:bg-surface-card={tab !== (tabKey === 'rate.limits' ? 'rate-limits' : tabKey)}
        class:text-on-surface-variant={tab !== (tabKey === 'rate.limits' ? 'rate-limits' : tabKey)}
        class:border={tab !== (tabKey === 'rate.limits' ? 'rate-limits' : tabKey)}
        class:border-outline={tab !== (tabKey === 'rate.limits' ? 'rate-limits' : tabKey)}
      >{t('admin.' + (tabKey === 'rate.limits' ? 'rate.limits' : tabKey))}</button>
    {/each}
    <button
      onclick={refreshData}
      disabled={refreshing}
      class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ml-auto bg-surface-card text-on-surface-variant border border-outline hover:bg-surface-container disabled:opacity-50"
    >
      <span class:animate-pulse={refreshing}>{t('common.refresh')}</span>
    </button>
  </div>

  {#if loading}
    <div class="text-center py-16">
      <p class="text-on-surface-variant text-sm">{t('common.loading')}</p>
    </div>
  {:else if loadError}
    <div class="text-center py-16">
      <p class="text-on-surface-variant text-sm mb-4">{t('common.error')}</p>
      <button onclick={refreshData} class="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold">{t('common.refresh')}</button>
    </div>
  {:else if tab === 'overview'}
    <div class="grid grid-cols-2 gap-3">
      {#each statCards as s}
        <div class="card p-4">
          <s.icon size={20} class="text-primary mb-2" />
          <p class="text-2xl font-bold tracking-tight">{s.value()}</p>
          <p class="text-xs text-on-surface-variant">{t('admin.stats.' + s.key)}</p>
        </div>
      {/each}
    </div>
  {:else if tab === 'users'}
    <p class="text-sm text-on-surface-variant mb-3">{users.length} {t('admin.users')}</p>
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-surface-container-high border-b border-outline">
            <th class="text-left px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">{t('common.name')}</th>
            <th class="text-left px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">{t('common.email')}</th>
            <th class="text-left px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">Role</th>
            <th class="text-right px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          {#each paginatedUsers as u (u.id)}
            <tr class="hover:bg-surface-container transition-colors">
              <td class="px-3 py-2.5 font-medium truncate max-w-[10rem]">{userLabel(u)}</td>
              <td class="px-3 py-2.5 text-on-surface-variant text-xs truncate max-w-[12rem]">{u.email}</td>
              <td class="px-3 py-2.5">
                <span class="badge {u.role === 'admin' ? 'badge-positive' : 'badge-neutral'}">
                  {u.role === 'admin' ? t('admin.role.admin') : t('admin.role.user')}
                </span>
              </td>
              <td class="px-3 py-2.5 text-right whitespace-nowrap">
                <button onclick={() => toggleRole(u)} class="text-xs font-semibold text-primary hover:underline px-2 py-1">
                  {u.role === 'admin' ? t('admin.role.user') : t('admin.role.admin')}
                </button>
                <button onclick={() => deleteUser(u)} class="text-xs font-semibold text-secondary hover:underline px-2 py-1">
                  {t('common.delete')}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if userPageCount > 1}
      <div class="flex items-center justify-center gap-4 py-3">
        <button onclick={() => { if (userPage > 0) userPage-- }} disabled={userPage === 0} class="p-2 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant">
          <ChevronLeft size={18} />
        </button>
        <span class="text-sm text-on-surface-variant">{userPage + 1} / {userPageCount}</span>
        <button onclick={() => { if (userPage < userPageCount - 1) userPage++ }} disabled={userPage >= userPageCount - 1} class="p-2 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant">
          <ChevronRight size={18} />
        </button>
      </div>
    {/if}
  {:else if tab === 'rate-limits'}
    <p class="text-sm text-on-surface-variant mb-3">{rateLimits.length} {t('admin.rate.limits')}</p>
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-surface-container-high border-b border-outline">
            <th class="text-left px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">IP</th>
            <th class="text-left px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">Group</th>
            <th class="text-left px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          {#each paginatedLimits as r (r.id)}
            <tr class="hover:bg-surface-container transition-colors">
              <td class="px-3 py-2.5 font-mono text-xs">{r.ipAddress}</td>
              <td class="px-3 py-2.5 text-xs">{r.reason}</td>
              <td class="px-3 py-2.5 text-xs text-on-surface-variant">{new Date(r.triggeredAt).toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if limitPageCount > 1}
      <div class="flex items-center justify-center gap-4 py-3">
        <button onclick={() => { if (limitPage > 0) limitPage-- }} disabled={limitPage === 0} class="p-2 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant">
          <ChevronLeft size={18} />
        </button>
        <span class="text-sm text-on-surface-variant">{limitPage + 1} / {limitPageCount}</span>
        <button onclick={() => { if (limitPage < limitPageCount - 1) limitPage++ }} disabled={limitPage >= limitPageCount - 1} class="p-2 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant">
          <ChevronRight size={18} />
        </button>
      </div>
    {/if}
  {/if}
</main>