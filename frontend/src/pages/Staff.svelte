<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import { Users, UserPlus, Trash2, Shield, X, QrCode, Camera, CheckCircle2 } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'
  import { showToast } from '../stores/toast.svelte'
  import type { StaffMember } from '../lib/types'
  import { Html5Qrcode } from 'html5-qrcode'

  let staff = $state<StaffMember[]>([])
  let loading = $state(true)
  let showAdd = $state(false)
  let newEmail = $state('')
  let newRole = $state<'owner' | 'cashier'>('cashier')
  let adding = $state(false)
  let error = $state('')

  let showRecruitScan = $state(false)
  let recruitScanner = $state<Html5Qrcode | null>(null)
  let recruitScanning = $state(false)
  let recruitError = $state('')
  let recruiting = $state(false)

  onMount(async () => {
    await loadStaff()
  })
  onDestroy(() => { stopRecruitScan() })

  async function loadStaff() {
    try {
      const data = await api.get<{ staff: StaffMember[] }>('/api/business/staff')
      staff = data.staff
    } catch {}
    loading = false
  }

  async function addStaff() {
    if (!newEmail.trim()) return
    adding = true
    error = ''
    try {
      await api.post('/api/business/staff', { email: newEmail.trim(), role: newRole })
      await loadStaff()
      newEmail = ''
      showAdd = false
    } catch (e: any) {
      error = e.message || 'Failed to add staff'
    } finally {
      adding = false
    }
  }

  async function removeStaff(userId: string) {
    try {
      await api.delete(`/api/business/staff/${userId}`)
      staff = staff.filter(s => s.userId !== userId)
    } catch {}
  }

  function getRoleBadge(role: string) {
    return role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
  }

  async function startRecruitScan() {
    recruitError = ''
    await tick()
    recruitScanner = new Html5Qrcode('recruit-scanner-viewport')
    try {
      await recruitScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onRecruitScan, () => {})
      recruitScanning = true
    } catch (e: any) {
      recruitError = e?.message || t('scan.camera_error')
      recruitScanner = null
    }
  }

  function stopRecruitScan() {
    if (recruitScanner) {
      try { if ((recruitScanner as any).getState() === 2) recruitScanner.stop() } catch {}
      try { recruitScanner.clear() } catch {}
      recruitScanner = null
    }
    recruitScanning = false
  }

  async function closeRecruitScan() {
    stopRecruitScan()
    showRecruitScan = false
    recruitError = ''
  }

  async function onRecruitScan(payload: string) {
    await stopRecruitScan()
    await recruit(payload)
  }

  async function recruit(qrPayload: string) {
    recruiting = true
    recruitError = ''
    try {
      const data = JSON.parse(qrPayload)
      const targetUserId = data?.u
      if (!targetUserId || typeof targetUserId !== 'string') throw new Error(t('staff.recruit_invalid'))
      await api.post('/api/business/staff/recruit', { userId: targetUserId })
      showRecruitScan = false
      showToast('success', t('staff.recruit_success'))
      await loadStaff()
    } catch (e: any) {
      recruitError = e.message || t('staff.recruit_error')
    } finally {
      recruiting = false
    }
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="flex items-center justify-between mb-6 animate-fade-in">
    <h1 class="text-xl font-bold">{t('staff.title')}</h1>
    <div class="flex items-center gap-2">
      <button onclick={() => showRecruitScan = true} class="btn btn-primary !min-h-10 !px-3" aria-label={t('staff.recruit_qr')}>
        <QrCode size={18} />
      </button>
      <button onclick={() => showAdd = !showAdd} class="btn btn-primary !min-h-10 !px-3" aria-label={t('staff.add')}>
        <UserPlus size={18} />
      </button>
    </div>
  </div>

  {#if showAdd}
    <div class="card p-4 mb-4 animate-slide-up">
      {#if error}
        <p class="text-lost-text text-sm mb-2">{error}</p>
      {/if}
      <form onsubmit={(e) => { e.preventDefault(); addStaff() }} class="space-y-3">
        <input bind:value={newEmail} type="email" placeholder={t('staff.email_placeholder')} class="input-field" required />
        <select bind:value={newRole} class="input-field">
          <option value="cashier">{t('staff.cashier')}</option>
          <option value="owner">{t('staff.owner')}</option>
        </select>
        <div class="flex gap-2">
          <button type="button" onclick={() => { showAdd = false; error = '' }} class="btn btn-ghost flex-1">{t('common.cancel')}</button>
          <button type="submit" disabled={adding || !newEmail.trim()} class="btn btn-primary flex-1">
            {adding ? t('common.loading') : t('common.confirm')}
          </button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <div class="space-y-2">
      {#each [1, 2, 3] as _}
        <div class="card p-3 animate-pulse flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-surface-container-high"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-surface-container-high rounded w-1/3"></div>
            <div class="h-3 bg-surface-container-high rounded w-1/4"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if staff.length === 0}
    <div class="card p-8 text-center">
      <Users size={28} class="text-on-surface-variant mx-auto mb-2" />
      <p class="text-sm text-on-surface-variant">{t('staff.empty')}</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each staff as member, i}
        <div class="card p-3 flex items-center gap-3 animate-slide-up" style="animation-delay: {i * 40}ms">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-sm font-bold text-primary">{(member.firstName || member.email || '?')[0].toUpperCase()}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{member.firstName || ''} {member.lastName || member.email}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full {getRoleBadge(member.role)}">
                {member.role === 'owner' ? t('staff.owner') : t('staff.cashier')}
              </span>
            </div>
            <p class="text-[11px] text-on-surface-variant mt-1">
              {t('staff.points_awarded')}: <span class="font-semibold">{member.pointsAwarded ?? 0}</span>
              &middot; {member.transactionCount ?? 0} {t('staff.transactions')}
            </p>
          </div>
          {#if member.role !== 'owner'}
            <button onclick={() => removeStaff(member.userId)} class="p-2 rounded-lg hover:bg-lost-bg transition-colors shrink-0" aria-label={t('staff.remove')}>
              <Trash2 size={16} class="text-lost-text" />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>

{#if showRecruitScan}
  <div class="fixed inset-0 z-[60] bg-black/90 flex flex-col">
    <div class="flex items-center justify-between p-4 text-white">
      <h2 class="font-semibold">{t('staff.recruit_scan_title')}</h2>
      <button onclick={closeRecruitScan} aria-label={t('common.cancel')}>
        <X size={24} />
      </button>
    </div>
    <div class="flex-1 flex flex-col items-center justify-center p-4 gap-4">
      <div id="recruit-scanner-viewport" class="w-full max-w-sm aspect-square rounded-xl overflow-hidden bg-black"></div>
      {#if !recruitScanning}
        <button onclick={startRecruitScan} class="btn btn-primary">
          <Camera size={18} class="mr-2" />
          {t('scan.start_scanning')}
        </button>
      {/if}
      {#if recruiting}
        <p class="flex items-center gap-2 text-white"><CheckCircle2 size={18} />{t('common.loading')}</p>
      {/if}
      {#if recruitError}
        <p class="text-red-300 text-sm text-center px-4">{recruitError}</p>
      {/if}
    </div>
  </div>
{/if}

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
