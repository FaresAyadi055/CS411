<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { Users, ShieldCheck, UserPlus, ShieldAlert, Store, ChevronLeft, ChevronRight, Plus, Trash2 } from '@lucide/svelte'
  import { t } from '../../lib/i18n.svelte'
  import { navigate } from '../../stores/router.svelte'
  import { showToast } from '../../stores/toast.svelte'
  import api, { invalidateCache } from '../../lib/api'
  import type { AdminStats, AdminUser, RateLimitItem, Merchant } from '../../lib/types'

  let tab = $state('overview')
  let loading = $state(true)
  let loadError = $state(false)
  let refreshing = $state(false)

  let stats = $state<AdminStats | null>(null)
  let users = $state<AdminUser[]>([])
  let merchants = $state<Merchant[]>([])
  let rateLimits = $state<RateLimitItem[]>([])

  let showCreateMerchant = $state(false)
  let merchantForm = $state({ name: '', slug: '', email: '' })
  let creating = $state(false)

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
      const [statsData, usersData, limitsData, merchantsData] = await Promise.all([
        api.get<AdminStats>('/api/admin/stats'),
        api.get<{ users: AdminUser[] }>('/api/admin/users'),
        api.get<{ items: RateLimitItem[] }>('/api/admin/rate-limits'),
        api.get<{ merchants: Merchant[] }>('/api/admin/merchants'),
      ])
      stats = statsData
      users = usersData.users
      rateLimits = limitsData.items
      merchants = merchantsData.merchants
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
    const nextRole = u.role === 'admin' ? 'client' : 'admin'
    try {
      await api.patch<{ user: AdminUser }>(`/api/admin/users/${u.id}`, { role: nextRole })
      u.role = nextRole
      showToast('success', nextRole === 'admin' ? t('admin.role.admin') : t('admin.role.client'))
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

  async function createMerchant() {
    if (!merchantForm.name.trim() || !merchantForm.slug.trim()) return
    creating = true
    try {
      await api.post('/api/admin/merchants', merchantForm)
      const data = await api.get<{ merchants: Merchant[] }>('/api/admin/merchants')
      merchants = data.merchants
      showCreateMerchant = false
      merchantForm = { name: '', slug: '', email: '' }
      showToast('success', 'Merchant created')
    } catch (e: any) {
      showToast('error', e.message || 'Failed to create merchant')
    } finally {
      creating = false
    }
  }

  async function deleteMerchant(m: Merchant) {
    if (!confirm(`Delete merchant "${m.name}"?`)) return
    try {
      await api.delete(`/api/admin/merchants/${m.id}`)
      merchants = merchants.filter(x => x.id !== m.id)
      showToast('success', 'Merchant deleted')
    } catch {
      showToast('error', t('error.generic'))
    }
  }

  async function refreshData() {
    refreshing = true
    invalidateCache()
    try {
      const [statsData, usersData, limitsData, merchantsData] = await Promise.all([
        api.get<AdminStats>('/api/admin/stats'),
        api.get<{ users: AdminUser[] }>('/api/admin/users'),
        api.get<{ items: RateLimitItem[] }>('/api/admin/rate-limits'),
        api.get<{ merchants: Merchant[] }>('/api/admin/merchants'),
      ])
      stats = statsData
      users = usersData.users
      rateLimits = limitsData.items
      merchants = merchantsData.merchants
    } catch (e) {
      console.error(e)
      loadError = true
    }
    refreshing = false
  }

  type AdminCustomer = {
    customerId: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    email: string
    fidelityPoints: number
    lifetimePoints: number
    spentFidelity: number
    lastVisitAt: number | null
  }

  let selectedMerchant = $state<Merchant | null>(null)
  let merchantCustomers = $state<AdminCustomer[]>([])
  let loadingCustomers = $state(false)
  let selectedCustomers = $state<string[]>([])
  let allocAmount = $state('')
  let allocating = $state(false)

  const selectedCount = $derived(selectedCustomers.length)

  async function openMerchant(m: Merchant) {
    selectedMerchant = m
    selectedCustomers = []
    loadingCustomers = true
    try {
      const data = await api.get<{ customers: AdminCustomer[] }>(
        `/api/admin/merchants/${m.id}/customers`,
      )
      merchantCustomers = data.customers
    } catch {
      showToast('error', t('error.generic'))
      merchantCustomers = []
    }
    loadingCustomers = false
  }

  function closeMerchant() {
    selectedMerchant = null
    selectedCustomers = []
  }

  function toggleCustomer(id: string) {
    if (selectedCustomers.includes(id)) {
      selectedCustomers = selectedCustomers.filter((x) => x !== id)
    } else {
      selectedCustomers = [...selectedCustomers, id]
    }
  }

  async function allocate(sign: 1 | -1) {
    if (selectedCustomers.length === 0) {
      showToast('error', t('admin.customer.select_one'))
      return
    }
    const amt = Number(allocAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('error', t('admin.customer.amount'))
      return
    }
    allocating = true
    let done = 0
    for (const cid of selectedCustomers) {
      try {
        await api.post(`/api/admin/merchants/${selectedMerchant!.id}/adjust`, {
          customerId: cid,
          balanceType: 'fidelity',
          amount: sign * amt,
        })
        done++
      } catch (e: any) {
        showToast('error', e.message || t('error.generic'))
      }
    }
    allocating = false
    if (selectedMerchant) {
      const upd = merchants.find((m) => m.id === selectedMerchant!.id)
      if (upd) upd.pointsBalance = Math.max(0, upd.pointsBalance - sign * amt * done)
      await openMerchant(selectedMerchant)
    }
    showToast('success', t('admin.customer.allocated', { n: done.toString() }))
  }

  let fundAmount = $state('')
  let funding = $state(false)
  let revoking = $state(false)

  async function fundMerchant() {
    if (!selectedMerchant) return
    const amt = Number(fundAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('error', t('admin.customer.amount'))
      return
    }
    funding = true
    try {
      await api.post(`/api/admin/merchants/${selectedMerchant.id}/fund`, { amount: amt })
      fundAmount = ''
      showToast('success', t('admin.merchant.funded', { n: amt.toString() }))
      const updated = merchants.find((m) => m.id === selectedMerchant!.id)
      if (updated) updated.pointsFunded += amt
      if (updated) updated.pointsBalance += amt
      await openMerchant(selectedMerchant)
    } catch (e: any) {
      showToast('error', e.message || t('error.generic'))
    } finally {
      funding = false
    }
  }

  async function revokeMerchant() {
    if (!selectedMerchant) return
    const amt = Number(fundAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('error', t('admin.customer.amount'))
      return
    }
    revoking = true
    try {
      await api.post(`/api/admin/merchants/${selectedMerchant.id}/revoke`, { amount: amt })
      fundAmount = ''
      showToast('success', t('admin.merchant.revoked', { n: amt.toString() }))
      const updated = merchants.find((m) => m.id === selectedMerchant!.id)
      if (updated) updated.pointsFunded = Math.max(0, updated.pointsFunded - amt)
      if (updated) updated.pointsBalance = Math.max(0, updated.pointsBalance - amt)
      await openMerchant(selectedMerchant)
    } catch (e: any) {
      showToast('error', e.message || t('error.generic'))
    } finally {
      revoking = false
    }
  }

  const statCards = $derived([
    { icon: Users, key: 'users', value: stats?.users ?? 0 },
    { icon: ShieldCheck, key: 'admins', value: stats?.admins ?? 0 },
    { icon: UserPlus, key: 'new24h', value: stats?.newUsers24h ?? 0 },
    { icon: ShieldAlert, key: 'rate24h', value: stats?.rateLimited24h ?? 0 },
    { icon: Store, key: 'merchants', value: merchants.length },
  ])
</script>

<main class="px-4 py-4">
  <div class="flex items-center gap-2 mb-4">
    <button onclick={back} class="text-on-surface-variant"><ChevronLeft size={20} /></button>
    <h1 class="text-xl font-bold">{t('admin.title')}</h1>
  </div>

  <div class="flex gap-2 mb-4 overflow-x-auto">
    {#each ['overview', 'users', 'merchants', 'rate.limits'] as tabKey}
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
          <p class="text-2xl font-bold tracking-tight">{s.value}</p>
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
                  {u.role === 'admin' ? t('admin.role.admin') : t('admin.role.client')}
                </span>
              </td>
              <td class="px-3 py-2.5 text-right whitespace-nowrap">
                <button onclick={() => toggleRole(u)} class="text-xs font-semibold text-primary hover:underline px-2 py-1">
                  {u.role === 'admin' ? t('admin.role.client') : t('admin.role.admin')}
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
  {:else if tab === 'merchants'}
    {#if selectedMerchant}
      <div class="flex items-center gap-2 mb-4">
        <button onclick={closeMerchant} class="text-on-surface-variant"><ChevronLeft size={20} /></button>
        <div class="min-w-0">
          <h2 class="text-lg font-bold truncate">{selectedMerchant.name}</h2>
          <p class="text-xs text-on-surface-variant">/{selectedMerchant.slug} · {t('admin.merchants.customers')}</p>
        </div>
      </div>

      <div class="card p-4 mb-4 bg-surface-container-low">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p class="text-xs text-on-surface-variant uppercase tracking-wide">{t('admin.merchant.points_balance')}</p>
            <p class="text-2xl font-bold text-primary">{selectedMerchant.pointsBalance.toLocaleString()}</p>
            <p class="text-[11px] text-on-surface-variant">{t('admin.merchant.points_funded', { n: selectedMerchant.pointsFunded.toLocaleString() })}</p>
          </div>
          <div class="flex items-center gap-2">
            <input
              bind:value={fundAmount}
              type="number"
              min="1"
              placeholder="0"
              class="input-field w-24"
            />
            <button onclick={fundMerchant} disabled={funding} class="btn btn-primary !text-xs !px-3 !py-1.5 disabled:opacity-50">
              {funding ? t('common.saving') : t('admin.merchant.fund')}
            </button>
            <button onclick={revokeMerchant} disabled={revoking} class="!text-xs !px-3 !py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              {revoking ? t('common.saving') : t('admin.merchant.revoke')}
            </button>
          </div>
        </div>
        {#if selectedMerchant.pointsBalance <= 0}
          <p class="text-xs font-semibold text-amber-700 mt-2">{t('points.out_of_points_desc')}</p>
        {/if}
      </div>

      {#if loadingCustomers}
        <div class="text-center py-16">
          <p class="text-on-surface-variant text-sm">{t('common.loading')}</p>
        </div>
      {:else if merchantCustomers.length === 0}
        <div class="card p-8 text-center">
          <p class="text-sm text-on-surface-variant">{t('admin.customer.none')}</p>
        </div>
      {:else}
        <div class="card p-0 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-surface-container-high border-b border-outline">
                <th class="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedCount === merchantCustomers.length}
                    onchange={() =>
                      selectedCount === merchantCustomers.length
                        ? (selectedCustomers = [])
                        : (selectedCustomers = merchantCustomers.map((c) => c.customerId))}
                    aria-label={t('admin.customer.select_all')}
                    class="accent-primary w-4 h-4"
                  />
                </th>
                <th class="text-left px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">{t('common.name')}</th>
                <th class="text-right px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">{t('admin.customer.balance')}</th>
                <th class="text-right px-3 py-2.5 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">{t('admin.customer.spent')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline">
              {#each merchantCustomers as c (c.customerId)}
                <tr class="hover:bg-surface-container transition-colors" class:bg-surface-container={selectedCustomers.includes(c.customerId)}>
                  <td class="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(c.customerId)}
                      onchange={() => toggleCustomer(c.customerId)}
                      class="accent-primary w-4 h-4"
                    />
                  </td>
                  <td class="px-3 py-2.5 font-medium truncate max-w-[10rem]">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
                  </td>
                  <td class="px-3 py-2.5 text-right whitespace-nowrap">
                    <div class="text-primary font-semibold">{c.fidelityPoints} <span class="text-[10px] font-normal text-on-surface-variant">{t('admin.customer.fidelity')}</span></div>
                  </td>
                  <td class="px-3 py-2.5 text-right whitespace-nowrap">
                    <div class="text-on-surface-variant">{c.spentFidelity} <span class="text-[10px]">{t('admin.customer.fidelity')}</span></div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if selectedCount > 0}
          <div class="card p-3 mt-3 sticky bottom-2 flex flex-wrap items-center gap-2 animate-slide-up">
            <span class="text-xs text-on-surface-variant mr-1">{selectedCount} {t('common.selected')}</span>
            <input
              bind:value={allocAmount}
              type="number"
              min="1"
              placeholder={t('admin.customer.amount')}
              class="w-24 px-3 py-1.5 rounded-xl border border-outline bg-surface-card text-sm"
            />
            <button onclick={() => allocate(1)} disabled={allocating} class="btn btn-primary !text-xs !px-3 !py-1.5 disabled:opacity-50">
              + {t('admin.customer.allocate')}
            </button>
            <button onclick={() => allocate(-1)} disabled={allocating} class="btn btn-secondary !text-xs !px-3 !py-1.5 disabled:opacity-50">
              − {t('admin.customer.deduct')}
            </button>
          </div>
        {/if}
      {/if}
    {:else}
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm text-on-surface-variant">{merchants.length} merchants</p>
        <button onclick={() => showCreateMerchant = !showCreateMerchant} class="btn btn-primary !text-xs !px-3 !py-1.5">
          <Plus size={14} class="mr-1" />
          Create
        </button>
      </div>
      {#if showCreateMerchant}
        <div class="card p-4 mb-3 animate-slide-up">
          <form onsubmit={(e) => { e.preventDefault(); createMerchant() }} class="space-y-3">
            <input bind:value={merchantForm.name} placeholder="Business name" class="w-full px-3 py-2 rounded-xl border border-outline bg-surface-card text-sm" required />
            <input bind:value={merchantForm.slug} placeholder="Slug (e.g. my-cafe)" class="w-full px-3 py-2 rounded-xl border border-outline bg-surface-card text-sm" required />
            <input bind:value={merchantForm.email} type="email" placeholder="Owner email" class="w-full px-3 py-2 rounded-xl border border-outline bg-surface-card text-sm" required />
            <div class="flex gap-2">
              <button type="button" onclick={() => showCreateMerchant = false} class="flex-1 px-3 py-2 rounded-xl border border-outline text-sm">Cancel</button>
              <button type="submit" disabled={creating} class="flex-1 btn btn-primary !text-xs">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      {/if}
      <div class="space-y-2">
        {#each merchants as m (m.id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => openMerchant(m)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') openMerchant(m) }}
            class="card p-3 flex items-center gap-3 cursor-pointer hover:border-primary transition-colors"
          >
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Store size={18} class="text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{m.name}</p>
              <p class="text-xs text-on-surface-variant">/{m.slug}</p>
            </div>
            <button
              onclick={(e) => { e.stopPropagation(); deleteMerchant(m) }}
              class="p-2 rounded-lg hover:bg-lost-bg transition-colors"
              aria-label={t('common.delete')}
            >
              <Trash2 size={14} class="text-lost-text" />
            </button>
          </div>
        {/each}
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