<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import { ScanLine, Camera, CheckCircle2, AlertCircle, Pause, Plus, ChevronDown, Gift } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'
  import type { Merchant } from '../lib/types'
  import { setBusinessPoints, getBusinessPoints } from '../stores/businessPoints.svelte'
  import { showToast } from '../stores/toast.svelte'
  import StarBadge from '../components/StarBadge.svelte'
  import { Html5Qrcode } from 'html5-qrcode'

  let merchant = $state<Merchant | null>(null)
  let scanner = $state<Html5Qrcode | null>(null)
  let scanning = $state(false)
  let cameraError = $state('')
  
  type CardBalances = { fidelityPoints: number; lifetimePoints: number }
  type Reward = { id: string; title: string; description: string | null; stampsCost: number; imageUrl?: string | null }
  let verifyResult = $state<{ customerId: string, customerName: string } | null>(null)
  let card = $state<CardBalances | null>(null)
  let serverCard = $state<CardBalances | null>(null)
  
  let verifying = $state(false)
  let verifyError = $state('')
  let committing = $state(false)
  let adjustError = $state('')
  let successFlash = $state(false)

  let merchantRewards = $state<Reward[]>([])
  let showRewards = $state(false)
  let rewardsExpanded = $state(true)
  let redeemingRewardId = $state<string | null>(null)
  let affordableRewards = $derived(
    merchantRewards.filter((r) => (card?.fidelityPoints ?? 0) >= r.stampsCost)
  )

  // Manual entry
  let showManual = $state(false)
  let manualPayload = $state('')

  const round3 = (n: number) => Math.round(n * 1000) / 1000
  let fidelityDirty = $derived(card && serverCard && Math.abs(card.fidelityPoints - serverCard.fidelityPoints) > 0.0005)
  let hasPending = $derived(fidelityDirty)
  let merchantOutOfPoints = $derived((getBusinessPoints() ?? 1) <= 0)

  onMount(async () => { await refreshMerchant() })
  onDestroy(() => { stopScanner() })

  async function refreshMerchant() {
    try {
      const d = await api.get<{ merchant: Merchant }>('/api/cashier/merchant')
      merchant = d.merchant
      setBusinessPoints(Math.max(0, d.merchant.pointsBalance))
    } catch {}
  }

  async function startScanner() {
    resetAll()
    cameraError = ''
    verifyError = ''
    await tick()
    scanner = new Html5Qrcode('scanner-viewport')
    try { 
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, () => {}); 
      scanning = true 
    } 
    catch (e: any) { cameraError = e?.message || t('scan.camera_error'); scanner = null }
  }

  async function stopScanner() {
    if (scanner) { try { if (scanner.getState() === 2) await scanner.stop(); scanner.clear() } catch {} scanner = null }
    scanning = false
  }

  async function onScanSuccess(payload: string) { await stopScanner(); await verify(payload) }

  async function verify(qrPayload: string) {
    verifying = true; verifyError = ''
    try {
      const d = await api.post<any>('/api/cashier/verify', { qrPayload })
      verifyResult = { customerId: d.customerId, customerName: d.customerName }
      card = { fidelityPoints: d.fidelityPoints, lifetimePoints: d.lifetimePoints }
      serverCard = { ...card }
      try {
        const rd = await api.get<{ rewards: Reward[] }>('/api/cashier/rewards')
        merchantRewards = rd.rewards
        if (merchantRewards.some((r) => r.stampsCost <= d.fidelityPoints)) showRewards = true
      } catch {}
    } catch (e: any) { verifyError = e.message || 'Verify failed' }
    finally { verifying = false }
  }

  async function handleManualVerify() {
    if (!manualPayload.trim()) return
    await verify(manualPayload.trim())
    manualPayload = ''
    showManual = false
  }

  function addFidelityPoint() {
    if (!card) return
    card.fidelityPoints = round3(card.fidelityPoints + 1)
    card.lifetimePoints = round3(card.lifetimePoints + 1)
  }

  async function commitChanges() {
    if (!verifyResult || !card || !serverCard || committing || !hasPending) return
    committing = true; adjustError = ''
    try {
      if (fidelityDirty && card && serverCard) {
        const delta = round3(card.fidelityPoints - serverCard.fidelityPoints)
        const r = await api.post<CardBalances>('/api/cashier/adjust', { customerId: verifyResult.customerId, amount: delta })
        applyServer(r)
      }
      successFlash = true; setTimeout(() => successFlash = false, 2000)
    } catch (e: any) { adjustError = e.message || 'Adjust failed' }
    finally { committing = false; refreshMerchant() }
  }

  function applyServer(r: CardBalances) {
    card = { fidelityPoints: r.fidelityPoints, lifetimePoints: r.lifetimePoints }
    serverCard = { ...card }
  }

  function cancelEdits() { if (card && serverCard) card = { ...serverCard } }
  function resetAll() { verifyResult = null; card = null; serverCard = null; adjustError = ''; verifyError = ''; merchantRewards = []; showRewards = false; redeemingRewardId = null }

  async function redeemReward(reward: Reward) {
    if (!verifyResult || redeemingRewardId) return
    redeemingRewardId = reward.id
    try {
      const r = await api.post<CardBalances>('/api/cashier/redeem', {
        customerId: verifyResult.customerId,
        rewardId: reward.id,
      })
      applyServer(r)
      showToast('success', t('scan.redeem_success'))
      if ((card?.fidelityPoints ?? 0) < Math.min(...merchantRewards.map((x) => x.stampsCost), Infinity)) {
        showRewards = false
      }
    } catch (e: any) {
      showToast('error', e.message || 'Redeem failed')
    } finally {
      redeemingRewardId = null
      refreshMerchant()
    }
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="text-center mb-4">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
      <ScanLine size={28} class="text-primary" />
    </div>
    <h1 class="text-xl font-bold">{t('scan.title')}</h1>
    {#if merchant}<p class="text-sm text-on-surface-variant mt-1">{merchant.name}</p>{/if}
  </div>

  {#if merchantOutOfPoints}
    <div class="card p-4 mb-4 bg-amber-50 border border-amber-300 text-amber-800 text-sm">
      <p class="font-semibold">{t('points.out_of_points_title')}</p>
      <p class="mt-1">{t('points.out_of_points_desc')}</p>
    </div>
  {/if}

  {#if showManual}
    <div class="card p-6">
      <h2 class="font-semibold mb-4">{t('scan.enter_manually')}</h2>
      <form onsubmit={(e) => { e.preventDefault(); handleManualVerify() }} class="space-y-3">
        <textarea bind:value={manualPayload} placeholder="Paste QR payload here" class="input-field min-h-[100px]"></textarea>
        <div class="flex gap-2">
          <button type="button" onclick={() => { showManual = false }} class="btn btn-ghost flex-1">{t('common.cancel')}</button>
          <button type="submit" class="btn btn-primary flex-1">{t('scan.verify')}</button>
        </div>
      </form>
    </div>

  {:else if verifyResult}
    <div class="card p-6 animate-scale-in">
      <div class="text-center mb-6">
        <CheckCircle2 size={48} class="text-green-600 mx-auto mb-2" />
        <p class="text-sm font-medium">{t('scan.customer_verified')}</p>
        <h2 class="text-2xl font-bold mt-1">{verifyResult.customerName}</h2>
        <p class="text-xs text-on-surface-variant font-mono">{verifyResult.customerId.slice(0, 8)}...</p>
      </div>

{#if adjustError}<p class="text-lost-text text-sm mb-4">{adjustError}</p>{/if}
      {#if successFlash}<p class="text-green-600 text-sm mb-4">{t('scan.adjust_success')}</p>{/if}

      {#if fidelityDirty}
        <div class="mb-4 text-center text-sm font-medium">
          {#if fidelityDirty && card && serverCard}
            <span>
              {t('scan.fidelity_points')}: 
              <span class={card.fidelityPoints - serverCard.fidelityPoints > 0 ? 'text-green-600' : card.fidelityPoints - serverCard.fidelityPoints < 0 ? 'text-red-600' : 'text-gray-500'}>
                {card.fidelityPoints - serverCard.fidelityPoints > 0 ? '+' : ''}{card.fidelityPoints - serverCard.fidelityPoints}
              </span>
            </span>
          {/if}
        </div>
      {/if}

      <div class="mb-6">
        <div class="balance-card fidelity flex flex-col items-center p-4 bg-amber-100">
          <p class="balance-label">{t('scan.fidelity_points')}</p>
          <p class="balance-value text-3xl font-bold">{card?.fidelityPoints}</p>
          <button class="mt-3 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center" onclick={addFidelityPoint} disabled={committing}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      <button onclick={commitChanges} disabled={!hasPending || committing} class="btn btn-primary w-full">
        {committing ? t('scan.committing') : t('common.continue')}
      </button>

      {#if showRewards && affordableRewards.length > 0}
        <div class="mt-4 border border-outline rounded-xl overflow-hidden">
          <button onclick={() => (rewardsExpanded = !rewardsExpanded)} class="w-full flex items-center justify-between px-4 py-3 bg-surface-container">
            <span class="text-sm font-semibold flex items-center gap-2">
              <Gift size={16} class="text-primary" />{t('scan.rewards_available')}
              <span class="text-xs font-normal text-on-surface-variant">({affordableRewards.length})</span>
            </span>
            <ChevronDown size={18} class="text-on-surface-variant transition-transform duration-200 {rewardsExpanded ? 'rotate-180' : ''}" />
          </button>
          {#if rewardsExpanded}
            <div class="p-3 space-y-2">
              <p class="text-xs text-on-surface-variant px-1">{t('scan.rewards_affordable_hint')}</p>
              {#each affordableRewards as r (r.id)}
                <div class="flex items-center gap-3 border border-outline rounded-xl p-3">
                  {#if r.imageUrl}
                    <img src={r.imageUrl} alt={r.title} class="w-10 h-10 rounded-lg object-cover shrink-0 border border-outline" />
                  {:else}
                    <StarBadge size={40} star={18} />
                  {/if}
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold truncate">{r.title}</p>
                    <p class="text-xs text-primary mt-1">{r.stampsCost} {t('scan.fidelity_points')}</p>
                  </div>
                  <button onclick={() => redeemReward(r)} disabled={redeemingRewardId === r.id} class="btn btn-primary btn-sm shrink-0">
                    {redeemingRewardId === r.id ? t('common.loading') : t('scan.redeem')}
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      {#if hasPending && !committing}
        <button onclick={cancelEdits} class="btn btn-ghost w-full mt-2">{t('common.cancel')}</button>
      {/if}
      <button onclick={() => { resetAll(); startScanner() }} class="btn btn-secondary w-full mt-4">{t('scan.scan_another')}</button>
    </div>

  {:else}
    <div class="card p-4">
      {#if verifying}
        <div class="flex flex-col items-center justify-center py-10 gap-3">
          <div class="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <p class="text-sm text-on-surface-variant">{t('scan.verifying')}</p>
        </div>
      {:else if verifyError}
        <div class="text-center py-10">
          <p class="text-lost-text mb-4">{verifyError}</p>
          <button onclick={startScanner} class="btn btn-primary w-full mb-2">{t('scan.retry')}</button>
          <button onclick={() => showManual = true} class="btn btn-secondary w-full">{t('scan.enter_manually')}</button>
        </div>
      {:else}
        <div id="scanner-viewport" class="aspect-square bg-black rounded-xl mb-4 overflow-hidden relative block w-full">
           {#if !scanning && !cameraError}
              <div class="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Camera size={40} class="mb-2" />
                <p>{t('scan.tap_to_scan')}</p>
              </div>
           {/if}
           <div class="absolute inset-0 z-10 w-full h-full"></div>
        </div>
        {#if cameraError}<p class="text-lost-text text-center mb-4">{cameraError}</p>{/if}
        {#if scanning}
          <button onclick={stopScanner} class="btn bg-lost-bg text-lost-text w-full mb-2">{t('common.cancel')}</button>
        {:else}
          <button onclick={startScanner} class="btn btn-primary w-full mb-2">{cameraError ? t('scan.retry_camera') : t('scan.start_scanning')}</button>
        {/if}
        <button onclick={() => showManual = true} class="btn btn-secondary w-full">{t('scan.enter_manually')}</button>
      {/if}
    </div>
  {/if}
</main>

<style>
  .balance-card { border-radius: 1rem; border: 1px solid #ddd; }
  .balance-label { font-size: 0.75rem; color: #666; }
</style>