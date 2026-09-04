<script lang="ts">
  import { onDestroy } from 'svelte'
  import { Eye, EyeOff, ArrowLeft, Check } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import { sendResetOtp, resetPassword } from '../stores/auth.svelte'

  let step = $state<'email' | 'otp' | 'password' | 'done'>('email')
  let email = $state('')
  let otpCode = $state('')
  let newPassword = $state('')
  let showPassword = $state(false)
  let error = $state('')
  let loading = $state(false)
  let otpCooldown = $state(0)
  let otpCooldownTimer: ReturnType<typeof setInterval> | undefined

  onDestroy(() => {
    if (otpCooldownTimer) clearInterval(otpCooldownTimer)
  })

  function handleOtpInput(e: Event) {
    const target = e.target as HTMLInputElement
    otpCode = target.value.replace(/\D/g, '').slice(0, 6)
  }

  async function handleSendOtp() {
    if (!email) {
      error = t('error.required')
      return
    }
    error = ''
    loading = true
    try {
      await sendResetOtp(email)
      step = 'otp'
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
      loading = false
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) {
      error = t('auth.otp.verify.title')
      return
    }
    error = ''
    step = 'password'
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      error = t('auth.password.requirement.length')
      return
    }
    error = ''
    loading = true
    try {
      await resetPassword(email, otpCode, newPassword)
      step = 'done'
    } catch (e) {
      error = (e as Error).message
    } finally {
      loading = false
    }
  }

  async function handleResend() {
    error = ''
    loading = true
    try {
      await sendResetOtp(email)
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
      loading = false
    }
  }
</script>

<main class="min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-primary">{t('app.name')}</h1>
      <p class="text-on-surface-variant text-sm mt-1">{t('app.tagline')}</p>
    </div>

    <div class="card p-6">
      {#if step === 'email'}
        <button onclick={() => navigate('register')} class="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-4">
          <ArrowLeft size={16} />
          {t('auth.otp.back')}
        </button>
        <h2 class="text-lg font-bold tracking-tight mb-1">{t('auth.reset.title')}</h2>
        <p class="text-sm text-on-surface-variant mb-4">{t('auth.reset.desc')}</p>

        {#if error}
          <div class="bg-lost-bg text-lost-text text-sm p-3 rounded-lg mb-3">{error}</div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); handleSendOtp() }} class="space-y-3">
          <div>
            <label for="reset-email" class="field-label">
              {t('auth.email.placeholder')}<span class="req">*</span>
            </label>
            <input
              id="reset-email"
              bind:value={email}
              type="email"
              placeholder={t('auth.email.placeholder')}
              required
              class="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            class="btn btn-primary w-full"
          >
            {loading ? t('common.loading') : t('auth.reset.send.btn')}
          </button>
        </form>
      {:else if step === 'otp'}
        <button onclick={() => step = 'email'} class="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-4">
          <ArrowLeft size={16} />
          {t('auth.reset.change.email')}
        </button>
        <h2 class="text-lg font-bold tracking-tight mb-1">{t('auth.reset.otp.title')}</h2>
        <p class="text-sm text-on-surface-variant mb-4">{t('auth.reset.otp.desc', { email })}</p>

        {#if error}
          <div class="bg-lost-bg text-lost-text text-sm p-3 rounded-lg mb-3">{error}</div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); handleVerifyOtp() }} class="space-y-3">
          <input
            value={otpCode}
            oninput={handleOtpInput}
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder={t('auth.otp.placeholder')}
            maxlength={6}
            autocomplete="one-time-code"
            required
            class="w-full h-14 text-center text-2xl font-mono tracking-[0.3em] input-field"
          />
          <button
            type="submit"
            disabled={otpCode.length !== 6}
            class="btn btn-primary w-full"
          >
            {t('common.confirm')}
          </button>
        </form>

        <div class="text-center mt-4">
          {#if otpCooldown > 0}
            <p class="text-xs text-on-surface-variant">{t('auth.otp.resend.cooldown', { s: otpCooldown.toString() })}</p>
          {:else}
            <button onclick={handleResend} disabled={loading} class="text-sm text-primary font-semibold hover:underline disabled:opacity-50">
              {loading ? t('auth.otp.resend.sending') : t('auth.otp.resend')}
            </button>
          {/if}
        </div>
      {:else if step === 'password'}
        <button onclick={() => step = 'otp'} class="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-4">
          <ArrowLeft size={16} />
          {t('auth.otp.back')}
        </button>
        <h2 class="text-lg font-bold tracking-tight mb-1">{t('auth.reset.new.title')}</h2>
        <p class="text-sm text-on-surface-variant mb-4">{t('auth.reset.new.desc')}</p>

        {#if error}
          <div class="bg-lost-bg text-lost-text text-sm p-3 rounded-lg mb-3">{error}</div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); handleResetPassword() }} class="space-y-3">
          <div>
            <label for="new-password" class="field-label">
              {t('auth.password.placeholder')}<span class="req">*</span>
            </label>
            <div class="relative">
              <input
                id="new-password"
                bind:value={newPassword}
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
          </div>
          <button
            type="submit"
            disabled={loading || newPassword.length < 8}
            class="btn btn-primary w-full"
          >
            {loading ? t('common.loading') : t('auth.reset.new.btn')}
          </button>
        </form>
      {:else}
        <div class="text-center py-4">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-found-bg mb-4">
            <Check size={28} class="text-found-text" />
          </div>
          <h2 class="text-lg font-bold tracking-tight mb-1">{t('auth.reset.done.title')}</h2>
          <p class="text-sm text-on-surface-variant mb-6">{t('auth.reset.done.desc')}</p>
          <button
            onclick={() => navigate('register')}
            class="btn btn-primary w-full"
          >
            {t('auth.sign.in')}
          </button>
        </div>
      {/if}
    </div>
  </div>
</main>
