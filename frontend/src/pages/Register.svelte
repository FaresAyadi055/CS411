<script lang="ts">
  import { onMount } from 'svelte'
  import { Eye, EyeOff, UserCircle } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { getAuthErrorFromUrl, clearAuthErrorFromUrl, login, getReferral, getUser } from '../stores/auth.svelte'
  import { navigate } from '../stores/router.svelte'
  import { api } from '../lib/api'
  import demoCredentials from '../data/demo-credentials.json'

  let { isRegisterPage = false }: { isRegisterPage?: boolean } = $props()
  
  type ReferralPreview = { name: string; logoUrl: string | null }
  let referral = $state<ReferralPreview | null>(null)

  let email = $state('')
  let password = $state('')
  let showPassword = $state(false)
  let error = $state('')
  let loading = $state(false)

  function useCredential(cred: typeof demoCredentials[number]) {
    email = cred.email
    password = cred.password
    error = ''
  }

  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    business: 'bg-blue-100 text-blue-700 border-blue-200',
    client: 'bg-green-100 text-green-700 border-green-200',
  }


  async function handleSubmit() {
    error = ''
    loading = true
    try {
      await login(email, password)
    } catch (e) {
      error = (e as Error).message
    } finally {
      loading = false
    }
  }

  onMount(() => {
    const authError = getAuthErrorFromUrl()
    if (authError) {
      error = authError
      clearAuthErrorFromUrl()
    }
    const ref = getReferral()
    if (ref) {
      api
        .getPublic<{ merchant: ReferralPreview }>(`/api/public/merchant/${encodeURIComponent(ref)}`)
        .then((res) => {
          if (res.merchant) referral = res.merchant
        })
        .catch(() => {})
    }
    if (getUser()) {
      navigate('qr')
    }
  })
</script>

<main class="min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-primary">{t('app.name')}</h1>
      <p class="text-on-surface-variant text-sm mt-1">{t('app.tagline')}</p>
    </div>

    {#if referral}
      <div class="card p-3 mb-4 flex items-center gap-3">
        {#if referral.logoUrl}
          <img src={referral.logoUrl} alt="" class="w-10 h-10 rounded-lg object-cover shrink-0" />
        {/if}
        <p class="text-sm text-on-surface-variant">{t('referral.join', { name: referral.name })}</p>
      </div>
    {/if}

    <div class="card p-6 mb-4">
      <h2 class="text-lg font-bold tracking-tight mb-4">{t('auth.sign.in')}</h2>

        {#if error}
          <div class="bg-lost-bg text-lost-text text-sm p-3 rounded-lg mb-3">{error}</div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); handleSubmit() }} class="space-y-3">
          <div>
            <label for="login-email" class="field-label">
              {t('auth.email.placeholder')}<span class="req">*</span>
            </label>
            <input
              id="login-email"
              bind:value={email}
              type="email"
              placeholder={t('auth.email.placeholder')}
              required
              autocomplete="email"
              class="input-field"
            />
          </div>
          <div>
            <label for="login-password" class="field-label">
              {t('auth.password.placeholder')}<span class="req">*</span>
            </label>
            <div class="relative">
              <input
                id="login-password"
                bind:value={password}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password.placeholder')}
                required
                minlength={8}
                autocomplete="current-password"
                class="input-field pr-12"
              />
              <button
                type="button"
                onclick={() => showPassword = !showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {#if showPassword}
                  <EyeOff size={20} />
                {:else}
                  <Eye size={20} />
                {/if}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            class="btn btn-primary w-full"
          >
            {loading ? t('common.loading') : t('auth.sign.in.email')}
          </button>
        </form>

    </div>

    <div class="card p-6">
      <h2 class="text-sm font-bold tracking-tight mb-1">Demo Accounts</h2>
      <p class="text-xs text-on-surface-variant mb-3">Pick a role to explore the app instantly.</p>
      <div class="space-y-2">
        {#each demoCredentials as cred}
          <button
            type="button"
            onclick={() => useCredential(cred)}
            class="w-full flex items-center gap-3 p-3 rounded-lg border border-outline hover:bg-surface-container-low transition-colors text-left"
          >
            <UserCircle size={32} class="shrink-0 text-on-surface-variant" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium truncate">{cred.name}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border {roleBadgeColor[cred.role] || ''}">
                  {cred.role}
                </span>
              </div>
              <p class="text-xs text-on-surface-variant truncate">{cred.email}</p>
              <p class="text-[11px] text-on-surface-variant/70">{cred.description}</p>
            </div>
            <span class="text-xs text-primary font-semibold shrink-0">Use</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
</main>
