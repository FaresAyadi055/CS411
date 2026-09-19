<script lang="ts">
  import { onMount } from 'svelte'
  import { Save, Upload, X, Copy, Download } from '@lucide/svelte'
  import QRCode from 'qrcode'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'
  import { showToast } from '../stores/toast.svelte'
  import type { Merchant } from '../lib/types'

  let merchant = $state<Merchant | null>(null)
  let loading = $state(true)
  let savingField = $state('')
  let name = $state('')
  let stampsPerReward = $state(10)
  let logoUrl = $state('')
  let uploading = $state(false)
  let fileInput = $state<HTMLInputElement | null>(null)

  onMount(() => {
    ;(async () => {
      try {
        const data = await api.get<{ merchant: Merchant }>('/api/cashier/merchant')
        merchant = data.merchant
        name = data.merchant.name
        stampsPerReward = data.merchant.stampsPerReward
        logoUrl = data.merchant.logoUrl || ''
      } catch {}
      loading = false
    })()
  })

  async function saveField(field: string, patch: Record<string, unknown>) {
    savingField = field
    try {
      const data = await api.patch<{ merchant: Merchant }>('/api/business/settings', patch)
      merchant = data.merchant
      showToast('success', t('common.saved'))
    } catch (e: any) {
      showToast('error', e.message || 'Failed to save')
    } finally {
      savingField = ''
    }
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    uploading = true
    try {
      const data = await api.upload<{ url: string; id: string }>('/api/uploads/logo', file)
      logoUrl = data.url
      showToast('success', t('business.settings.logo_uploaded'))
    } catch (e: any) {
      showToast('error', e.message || 'Upload failed')
    } finally {
      uploading = false
      if (fileInput) fileInput.value = ''
    }
  }

  function removeLogo() {
    logoUrl = ''
  }

  let referralUrl = $derived(
    merchant ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${merchant.slug}` : '',
  )
  let referralQr = $state('')

  $effect(() => {
    const url = referralUrl
    if (!url) return
    QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      .then((uri) => {
        referralQr = uri
      })
      .catch(() => {
        referralQr = ''
      })
  })

  async function copyLink() {
    if (!referralUrl) return
    try {
      await navigator.clipboard.writeText(referralUrl)
      showToast('success', t('common.copied'))
    } catch {
      showToast('error', 'Failed to copy link')
    }
  }

  function downloadQr() {
    if (!referralQr) return
    const a = document.createElement('a')
    a.href = referralQr
    a.download = `fidelito-${merchant?.slug ?? 'referral'}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="mb-6 animate-fade-in">
    <h1 class="text-xl font-bold">{t('business.profile.title')}</h1>
  </div>

  {#if loading}
    <div class="card p-4 animate-pulse space-y-4">
      <div class="h-4 bg-surface-container-high rounded w-1/3"></div>
      <div class="h-10 bg-surface-container-high rounded"></div>
      <div class="h-10 bg-surface-container-high rounded"></div>
    </div>
  {:else if merchant}
    <div class="card p-4 space-y-4 animate-slide-up">
      <div class="flex flex-col items-center mb-2">
        {#if logoUrl}
          <div class="relative group mb-3">
            <img src={logoUrl} alt="Business logo" class="w-24 h-24 rounded-2xl object-cover border-2 border-outline" />
            <button
              onclick={removeLogo}
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        {:else}
          <button
            onclick={() => fileInput?.click()}
            disabled={uploading}
            class="w-24 h-24 rounded-2xl border-2 border-dashed border-outline flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors mb-3">
            {#if uploading}
              <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            {:else}
              <Upload size={20} class="text-on-surface-variant" />
              <span class="text-[10px] text-on-surface-variant">{t('business.settings.upload_logo')}</span>
            {/if}
          </button>
        {/if}
        <input
          bind:this={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onchange={handleFileSelect}
          class="hidden" />
        {#if !logoUrl}
          <button onclick={() => fileInput?.click()} disabled={uploading} class="text-xs text-primary">
            {uploading ? t('common.loading') : t('business.settings.upload_logo')}
          </button>
        {/if}
        <button
          onclick={() => saveField('logo', { logoUrl: logoUrl || null })}
          disabled={savingField === 'logo'}
          class="btn btn-secondary mt-2"
        >
          <Save size={16} class="mr-2" />{savingField === 'logo' ? t('common.saving') : t('common.save')}
        </button>
      </div>

      <div>
        <label class="field-label" for="biz-name">{t('business.settings.name')}</label>
        <input id="biz-name" bind:value={name} type="text" class="input-field" />
        <button
          onclick={() => saveField('name', { name: name.trim() })}
          disabled={savingField === 'name' || !name.trim()}
          class="btn btn-secondary w-full mt-2"
        >
          <Save size={16} class="mr-2" />{savingField === 'name' ? t('common.saving') : t('common.save')}
        </button>
      </div>
      <div>
        <label class="field-label" for="biz-spr">{t('business.settings.stamps_per_reward')}</label>
        <input id="biz-spr" bind:value={stampsPerReward} type="number" min="1" class="input-field" />
        <button
          onclick={() => saveField('spr', { stampsPerReward })}
          disabled={savingField === 'spr'}
          class="btn btn-secondary w-full mt-2"
        >
          <Save size={16} class="mr-2" />{savingField === 'spr' ? t('common.saving') : t('common.save')}
        </button>
      </div>
      <div class="card p-4 bg-surface-container-low">
        <p class="field-label">{t('business.settings.points_funded_title')}</p>
        <p class="text-2xl font-bold text-primary mt-1">{merchant.pointsBalance.toLocaleString()}</p>
        <p class="text-xs text-on-surface-variant mt-1">
          {t('business.settings.points_funded_desc', { funded: merchant.pointsFunded.toLocaleString() })}
        </p>
      </div>
    </div>

    <div class="card p-4 space-y-3 mt-4 animate-slide-up">
      <div>
        <h2 class="font-semibold">{t('business.profile.referral_title')}</h2>
        <p class="text-xs text-on-surface-variant mt-1">{t('business.profile.referral_desc')}</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          type="text"
          readonly
          value={referralUrl}
          onfocus={(e) => (e.target as HTMLInputElement).select()}
          class="input-field text-xs" />
        <button onclick={copyLink} class="btn btn-secondary shrink-0" aria-label={t('business.profile.copy_link')}>
          <Copy size={16} class="mr-1" />{t('business.profile.copy_link')}
        </button>
      </div>
      <div class="flex flex-col items-center pt-2">
        {#if referralQr}
          <img src={referralQr} alt="Referral QR code" class="w-48 h-48 rounded-xl border border-outline bg-white p-2" />
        {/if}
        <button onclick={downloadQr} class="btn btn-secondary mt-3" disabled={!referralQr}>
          <Download size={16} class="mr-1" />{t('business.profile.download_png')}
        </button>
      </div>
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
  .animate-slide-up { animation: slide-up 0.3s ease-out; }
</style>
