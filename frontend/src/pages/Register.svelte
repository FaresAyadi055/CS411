<script lang="ts">
  import { onMount } from 'svelte'
  import { Eye, EyeOff, ArrowLeft, Check, X } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import { getAuthErrorFromUrl, clearAuthErrorFromUrl, register, sendVerificationOtp, verifyEmailOtp } from '../stores/auth.svelte'
  import SocialLoginButtons from '../components/SocialLoginButtons.svelte'

  let name = $state('')
  let email = $state('')
  let password = $state('')
  let showPassword = $state(false)
  let consent = $state(false)
  let error = $state('')
  let loading = $state(false)
  let success = $state(false)
  let touched = $state(false)

  let otpStep = $state(false)
  let otpCode = $state('')
  let otpSending = $state(false)
  let otpSent = $state(false)
  let otpCooldown = $state(0)
  let otpCooldownTimer: ReturnType<typeof setInterval> | undefined

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
      otpStep = true
      await handleSendOtp()
    } catch (e) {
      error = (e as Error).message
    } finally {
      loading = false
    }
  }

  async function handleSendOtp() {
    error = ''
    otpSending = true
    try {
      await sendVerificationOtp(email)
      otpSent = true
      otpCooldown = 60
      if (otpCooldownTimer) clearInterval(otpCooldownTimer)
      otpCooldownTimer = setInterval(() => {
        otpCooldown--
        if (otpCooldown <= 0) {
          clearInterval(otpCooldownTimer)
          otpCooldownTimer = undefined
        }
      }, 1000)
    } catch (e) {
      error = (e as Error).message
    } finally {
      otpSending = false
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) {
      error = 'Please enter the 6-digit code'
      return
    }
    error = ''
    loading = true
    try {
      await verifyEmailOtp(email, otpCode)
      success = true
      setTimeout(() => navigate('login'), 2000)
    } catch (e) {
      error = (e as Error).message
    } finally {
      loading = false
    }
  }

  function backToForm() {
    otpStep = false
    otpCode = ''
    error = ''
  }

  function handleOtpInput(e: Event) {
    const target = e.target as HTMLInputElement
    otpCode = target.value.replace(/\D/g, '').slice(0, 6)
  }

  onMount(() => {
    const authError = getAuthErrorFromUrl()
    if (authError) {
      error = authError
      clearAuthErrorFromUrl()
    }
    return () => {
      if (otpCooldownTimer) clearInterval(otpCooldownTimer)
    }
  })
</script>

<main class="min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-primary">{t('app.name')}</h1>
      <p class="text-on-surface-variant text-sm mt-1">{t('app.tagline')}</p>
    </div>

    <div class="card p-6">
      {#if otpStep}
        <button onclick={backToForm} class="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-4">
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 class="text-lg font-bold tracking-tight mb-1">Verify your email</h2>
        <p class="text-sm text-on-surface-variant mb-4">Enter the 6-digit code sent to {email}</p>

        {#if error}
          <div class="bg-lost-bg text-lost-text text-sm p-3 rounded-lg mb-3">{error}</div>
        {/if}
        {#if success}
          <div class="bg-found-bg text-found-text text-sm p-3 rounded-lg mb-3">Account created! Redirecting to login...</div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); handleVerifyOtp() }} class="space-y-3">
          <input
            value={otpCode}
            oninput={handleOtpInput}
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            maxlength={6}
            autocomplete="one-time-code"
            required
            disabled={success}
            class="w-full h-14 text-center text-2xl font-mono tracking-[0.3em] input-field disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || otpCode.length !== 6 || success}
            class="btn btn-primary w-full"
          >
            {loading ? t('common.loading') : 'Verify email'}
          </button>
        </form>

        <div class="text-center mt-4">
          {#if otpCooldown > 0}
            <p class="text-xs text-on-surface-variant">Resend code in {otpCooldown}s</p>
          {:else}
            <button onclick={handleSendOtp} disabled={otpSending} class="text-sm text-primary font-semibold hover:underline disabled:opacity-50">
              {otpSending ? 'Sending...' : 'Resend code'}
            </button>
          {/if}
        </div>
      {:else}
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
      {/if}
    </div>
  </div>
</main>
