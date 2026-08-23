<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { QrCode, RefreshCw, Zap, Lock } from '@lucide/svelte'
  import QRCode from 'qrcode'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'
  import { generateTotp, buildQrPayload } from '../lib/totp'
  import { getUser } from '../stores/auth.svelte'

  const PERIOD = 30
  const QR_SECRET_KEY = 'fidelito_qr_secret'

  let qrDataUri = $state('')
  let totp = $state('')
  let payload = $state('')
  let loading = $state(true)
  let error = $state('')
  let provisioned = $state(false)
  let provisioning = $state(false)
  let fading = $state(false)
  let countdown = $state(30)
  let secret = $state('')
  let offline = $state(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  let interval: ReturnType<typeof setInterval> | undefined

  function remaining(): number {
    return PERIOD - (Math.floor(Date.now() / 1000) % PERIOD)
  }

  function saveQrSecret(s: string, userId?: string) {
    try {
      localStorage.setItem(QR_SECRET_KEY, JSON.stringify({ secret: s, userId: userId ?? getUser()?.id ?? '' }))
    } catch {
      /* ignore */
    }
  }

  function loadQrSecret(): { secret: string; userId: string } {
    try {
      const raw = localStorage.getItem(QR_SECRET_KEY)
      if (!raw) return { secret: '', userId: '' }
      const parsed = JSON.parse(raw)
      return { secret: parsed.secret ?? '', userId: parsed.userId ?? '' }
    } catch {
      return { secret: '', userId: '' }
    }
  }

  async function computeLocalQr(): Promise<boolean> {
    const cached = loadQrSecret()
    const s = secret || cached.secret
    const uid = getUser()?.id || cached.userId
    if (!s || !uid) return false
    const code = await generateTotp(s)
    totp = code
    payload = buildQrPayload(uid, code)
    await generateQr(payload)
    return true
  }

  async function generateQr(text: string) {
    try {
      qrDataUri = await QRCode.toDataURL(text, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      })
    } catch {
      qrDataUri = ''
    }
  }

  function clearTimer() {
    if (interval) {
      clearInterval(interval)
      interval = undefined
    }
  }

  async function fetchAndUpdate() {
    try {
      const data = await api.get<{ totp: string; payload: string; secret?: string; refreshInterval: number; remainingSeconds: number }>('/api/client/qr/current')
      totp = data.totp
      payload = data.payload
      if (data.secret) {
        secret = data.secret
        saveQrSecret(data.secret, getUser()?.id)
      }
      offline = false
      error = ''
      await generateQr(data.payload)
    } catch (e: any) {
      if (e.code === 'NOT_PROVISIONED') {
        error = ''
        return
      }
      offline = true
      const ok = await computeLocalQr()
      if (!ok) error = e.message || 'Failed to refresh QR'
      else error = ''
    }
  }

  function startClock() {
    clearTimer()
    countdown = remaining()
    let lastPeriod = Math.floor(Date.now() / 1000 / PERIOD)

    interval = setInterval(async () => {
      const r = remaining()
      countdown = r

      const currentPeriod = Math.floor(Date.now() / 1000 / PERIOD)
      if (currentPeriod !== lastPeriod) {
        lastPeriod = currentPeriod
        fading = true
        setTimeout(() => { fading = false }, 700)
        if (!navigator.onLine || offline) {
          await computeLocalQr()
        } else {
          await fetchAndUpdate()
        }
      }
    }, 100)
  }

  async function fetchQr() {
    try {
      fading = true
      const data = await api.get<{ totp: string; payload: string; secret?: string; refreshInterval: number; remainingSeconds: number }>('/api/client/qr/current')
      totp = data.totp
      payload = data.payload
      if (data.secret) {
        secret = data.secret
        saveQrSecret(data.secret, getUser()?.id)
      }
      provisioned = true
      error = ''
      offline = false
      await generateQr(data.payload)
      setTimeout(() => { fading = false }, 400)
    } catch (e: any) {
      fading = false
      if (e.code === 'NOT_PROVISIONED') {
        provisioned = false
      } else {
        const ok = await computeLocalQr()
        if (ok) {
          provisioned = true
          offline = true
          error = ''
        } else {
          error = e.message || 'Failed to load QR code'
        }
      }
    } finally {
      loading = false
    }
  }

  async function provision() {
    provisioning = true
    error = ''
    try {
      const data = await api.post<{ totp: string; payload: string; secret: string; refreshInterval: number }>('/api/client/qr/provision')
      totp = data.totp
      payload = data.payload
      secret = data.secret
      saveQrSecret(data.secret)
      provisioned = true
      await generateQr(data.payload)
      startClock()
    } catch (e: any) {
      if (e.code === 'ALREADY_PROVISIONED') {
        await fetchQr()
      } else {
        error = e.message || 'Failed to provision'
      }
    } finally {
      provisioning = false
    }
  }

  async function handleOnline() {
    offline = false
    if (provisioned) await fetchQr()
  }

  function handleOffline() {
    offline = true
  }

  onMount(async () => {
    await fetchQr()
    if (provisioned) startClock()
    if (!qrDataUri && (offline || !navigator.onLine)) {
      await computeLocalQr()
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onDestroy(() => {
    clearTimer()
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  $effect(() => {
    if (provisioned && !interval) {
      startClock()
    }
  })
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="text-center mb-6 animate-fade-in">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
      <QrCode size={28} class="text-primary" />
    </div>
    <h1 class="text-xl font-bold">{t('qr.title')}</h1>
    <p class="text-sm text-on-surface-variant mt-1">{t('qr.subtitle')}</p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  {:else if error}
    <div class="card p-6 text-center animate-fade-in">
      <p class="text-lost-text text-sm mb-4">{error}</p>
      <button onclick={fetchQr} class="btn btn-primary">{t('common.refresh')}</button>
    </div>
  {:else if !provisioned}
    <div class="card p-8 text-center animate-fade-in">
      <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <Zap size={36} class="text-primary" />
      </div>
      <p class="text-on-surface-variant text-sm mb-6">Generate your personal QR code to start earning stamps at partner businesses.</p>
      <button onclick={provision} disabled={provisioning} class="btn btn-primary w-full">
        {provisioning ? t('common.loading') : t('qr.provision')}
      </button>
    </div>
  {:else if qrDataUri}
    <div class="card p-6 text-center animate-scale-in">
      <div class="relative inline-block mb-4" class:qr-fading={fading}>
        <div class="bg-white p-5 rounded-2xl shadow-elevated">
          <img src={qrDataUri} alt="QR Code" class="w-64 h-64 mx-auto" />
        </div>
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full transition-opacity duration-200" class:opacity-0={fading}>
          {totp}
        </div>
      </div>

      <div class="mt-4 mb-2">
        <div class="inline-flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container-high px-4 py-2 rounded-full">
          <RefreshCw size={14} class={countdown <= 5 ? 'animate-spin' : ''} />
          <span>{t('qr.expires_in', { s: countdown.toString() })}</span>
        </div>
        <div class="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full"
            class:bar-ticking={countdown > 0 && countdown < PERIOD}
            style="width: {(countdown / PERIOD) * 100}%"
          ></div>
        </div>
      </div>

      <p class="text-xs text-on-surface-variant mt-4">Show this code to the cashier when checking out.</p>
    </div>

    <div class="flex justify-center mt-4">
      <div class="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
        <Lock size={13} />
        <span>{t('qr.secure_id')}</span>
      </div>
    </div>

    {#if offline}
      <p class="text-center text-xs text-on-surface-variant mt-3">{t('qr.offline')}</p>
    {/if}
  {/if}
</main>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in { animation: fade-in 0.3s ease-out; }
  .animate-scale-in { animation: scale-in 0.3s ease-out; }
  .qr-fading {
    animation: qr-fade 0.7s ease-in-out;
  }
  @keyframes qr-fade {
    0% { opacity: 1; transform: scale(1); }
    35% { opacity: 0; transform: scale(0.97); }
    65% { opacity: 0; transform: scale(0.97); }
    100% { opacity: 1; transform: scale(1); }
  }
  .bar-ticking {
    transition: width 1s linear;
  }
</style>
