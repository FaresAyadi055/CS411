<script lang="ts">
  import { onMount } from 'svelte'
  import { Eye, EyeOff } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import {
    login,
    checkSession,
    getAuthErrorFromUrl,
    clearAuthErrorFromUrl,
    hasRole,
    getUser,
    getLastLoginMethod,
    setLastLoginMethod,
    type LoginMethod,
  } from '../stores/auth.svelte'
  import SocialLoginButtons from '../components/SocialLoginButtons.svelte'

  let email = $state('')
  let password = $state('')
  let showPassword = $state(false)
  let error = $state('')
  let loading = $state(false)

  let lastLoginMethod = $state<LoginMethod | null>(getLastLoginMethod())

  onMount(() => {
    const authError = getAuthErrorFromUrl()
    if (authError) {
      error = authError
      clearAuthErrorFromUrl()
    }
    loading = true
    checkSession()
      .then(() => {
        if (getUser()) return redirectAfterLogin()
      })
      .finally(() => {
        loading = false
      })
  })

  async function redirectAfterLogin() {
    if (hasRole('admin')) {
      navigate('admin', { section: 'overview' })
      return
    }
    navigate('home')
  }

  async function handleSubmit() {
    error = ''
    loading = true
    try {
      await login(email, password)
      setLastLoginMethod('email')
      await redirectAfterLogin()
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
      <h2 class="text-lg font-bold tracking-tight mb-4">{t('auth.sign.in')}</h2>

      {#if error}
        <div class="bg-lost-bg text-lost-text text-sm p-3 rounded-lg mb-3">{error}</div>
      {/if}

      <SocialLoginButtons disabled={loading} {lastLoginMethod} />

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit() }} class="space-y-3 mt-4">
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
        <div class="text-right">
          <button
            type="button"
            onclick={() => navigate('forgot-password')}
            class="text-sm text-primary font-semibold hover:underline"
          >
            {t('auth.forgot.password')}
          </button>
        </div>
        <div class="relative">
          <button
            type="submit"
            disabled={loading}
            class="btn btn-primary w-full"
          >
            {loading ? t('common.loading') : t('auth.sign.in.email')}
          </button>
          {#if lastLoginMethod === 'email'}
            <span class="absolute -top-2 right-2 text-[10px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-full border border-outline">{t('auth.last.used')}</span>
          {/if}
        </div>
      </form>

      <p class="text-center text-sm text-on-surface-variant mt-4">
        {t('auth.no.account')}
        <button onclick={() => navigate('register')} class="text-primary font-semibold">{t('auth.sign.up')}</button>
      </p>
    </div>
  </div>
</main>
