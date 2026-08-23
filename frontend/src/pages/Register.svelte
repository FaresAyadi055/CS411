<script lang="ts">
  import { onMount } from 'svelte'
  import { Eye, EyeOff, Check, X } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import { api } from '../lib/api'
  import { getAuthErrorFromUrl, clearAuthErrorFromUrl, register, login, checkSession, getUser, hasRole, socialLoginRedirect, getReferral } from '../stores/auth.svelte'
  import SocialLoginButtons from '../components/SocialLoginButtons.svelte'

  type ReferralPreview = { name: string; logoUrl: string | null }
  let referral = $state<ReferralPreview | null>(null)

  let name = $state('')
  let email = $state('')
  let password = $state('')
  let phoneCode = $state('+216')
  let phoneNumber = $state('')
  let showPassword = $state(false)
  let consent = $state(false)
  let error = $state('')
  let loading = $state(false)
  let touched = $state(false)

  const requirements = $derived([
    { key: 'length', met: password.length >= 8 },
    { key: 'uppercase', met: /[A-Z]/.test(password) },
    { key: 'lowercase', met: /[a-z]/.test(password) },
    { key: 'number', met: /\d/.test(password) },
    { key: 'special', met: /[^A-Za-z0-9]/.test(password) },
  ])

  const passedCount = $derived(requirements.filter(r => r.met).length)

  const strength = $derived.by(() => {
    if (password.length === 0) return { label: '', level: 0, color: '' }
    if (passedCount <= 2) return { label: t('auth.password.weak'), level: 1, color: 'bg-lost-text' }
    if (passedCount <= 3) return { label: t('auth.password.medium'), level: 2, color: 'bg-warning-text' }
    return { label: t('auth.password.strong'), level: 3, color: 'bg-found-text' }
  })

  const allMet = $derived(requirements.every(r => r.met))

  async function handleSubmit() {
    if (!consent) {
      error = 'You must agree to the Terms of Service and Privacy Policy.'
      return
    }
    if (!allMet) {
      error = 'Password does not meet all requirements.'
      return
    }
    error = ''
    loading = true
    try {
      await register(email, password, name)
      await login(email, password)
      const phone = phoneNumber.trim()
      if (phone) {
        try {
          await api.patch('/api/me', { phone: `${phoneCode.trim()} ${phone}` })
        } catch {}
      }
      socialLoginRedirect()
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

    <div class="card p-6">
      <h2 class="text-lg font-bold tracking-tight mb-4">{t('auth.sign.up')}</h2>

        {#if error}
          <div class="bg-lost-bg text-lost-text text-sm p-3 rounded-lg mb-3">{error}</div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); handleSubmit() }} class="space-y-3">
          <div>
            <label for="reg-name" class="field-label">
              {t('auth.name.placeholder')}<span class="req">*</span>
            </label>
            <input
              id="reg-name"
              bind:value={name}
              type="text"
              placeholder={t('auth.name.placeholder')}
              required
              class="input-field"
            />
          </div>
          <div>
            <label for="reg-email" class="field-label">
              {t('auth.email.placeholder')}<span class="req">*</span>
            </label>
            <input
              id="reg-email"
              bind:value={email}
              type="email"
              placeholder={t('auth.email.placeholder')}
              required
              class="input-field"
            />
          </div>
          <div>
            <label for="reg-password" class="field-label">
              {t('auth.password.placeholder')}<span class="req">*</span>
            </label>
            <div class="relative">
              <input
                id="reg-password"
                bind:value={password}
                oninput={() => touched = true}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password.placeholder')}
                required
                minlength={8}
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
            {#if touched && password.length > 0}
              <div class="space-y-2 mt-2">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300 {strength.color}"
                      style="width: {strength.level * 33}%"
                    ></div>
                  </div>
                  {#if strength.label}
                    <span class="text-xs font-medium text-on-surface-variant shrink-0">{strength.label}</span>
                  {/if}
                </div>
                <ul class="space-y-1">
                  {#each requirements as req}
                    <li class="flex items-center gap-1.5 text-xs {req.met ? 'text-found-text' : 'text-on-surface-variant'}">
                      {#if req.met}
                        <Check size={12} class="shrink-0" />
                      {:else}
                        <X size={12} class="shrink-0" />
                      {/if}
                      {t('auth.password.requirement.' + req.key)}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
          <label class="flex items-start gap-2.5 text-xs text-on-surface-variant leading-relaxed">
            <input
              bind:checked={consent}
              type="checkbox"
              class="mt-0.5 shrink-0 w-4 h-4 rounded-sm border-outline text-primary focus:ring-primary"
            />
            <span>
              I agree to the platform's Terms of Service and Privacy Policy.
            </span>
          </label>

          <div>
            <label for="reg-phone" class="field-label">
              {t('auth.phone.placeholder')}
              <span class="req-optional">{t('common.optional')}</span>
            </label>
            <div class="flex gap-2">
              <input
                id="reg-phone-code"
                bind:value={phoneCode}
                type="text"
                inputmode="tel"
                placeholder="+216"
                class="input-field w-20 shrink-0"
              />
              <input
                id="reg-phone"
                bind:value={phoneNumber}
                type="tel"
                inputmode="numeric"
                placeholder="12 345 678"
                class="input-field flex-1"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !consent || !allMet}
            class="btn btn-primary w-full"
          >
            {loading ? t('common.loading') : t('auth.sign.up')}
          </button>
        </form>

        <div class="mt-4">
          <SocialLoginButtons disabled={loading} />
        </div>

        <p class="text-center text-sm text-on-surface-variant mt-4">
          {t('auth.has.account')}
          <button onclick={() => navigate('login')} class="text-primary font-semibold">{t('auth.sign.in')}</button>
        </p>
    </div>
  </div>
</main>
