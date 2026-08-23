<script lang="ts">
  import { Globe, LogOut, Palette, User, UserPlus, Bell, BellRing } from '@lucide/svelte'
  import { getThemePreference, setTheme, type ThemePreference } from '../stores/theme.svelte'
  import { t, setLocale, getLocale, locales, type Locale } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import { getUser, logout } from '../stores/auth.svelte'
  import api from '../lib/api'
  import { VERSION, VAPID_PUBLIC_KEY } from '../lib/config'
  import { subscribeToPush } from '../lib/push'
  import LocaleFlag from '../components/LocaleFlag.svelte'

  let locale = $state(getLocale())
  let themePref = $state<ThemePreference>(getThemePreference())
  const user = $derived(getUser())
  let notifEnabled = $state(user?.notificationsEnabled ?? true)
  let phone = $state(user?.phone ?? '')
  let phoneSaved = $state(user?.phone ?? '')
  let phoneSaving = $state(false)
  const phoneDirty = $derived(phone.trim() !== (phoneSaved ?? ''))
  let pushState = $state<'idle' | 'unsupported' | 'denied' | 'subscribed'>('idle')
  let pushBusy = $state(false)

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'settings.theme.light' },
    { value: 'dark', label: 'settings.theme.dark' },
    { value: 'system', label: 'settings.theme.system' },
  ]

  function selectTheme(value: ThemePreference) {
    themePref = value
    setTheme(value)
  }

  async function switchLocale(l: Locale) {
    setLocale(l)
    locale = getLocale()
    try {
      await api.patch('/api/me', { locale: l })
    } catch {}
  }

  async function toggleNotifications() {
    notifEnabled = !notifEnabled
    try {
      await api.patch('/api/me', { notificationsEnabled: notifEnabled })
    } catch {
      notifEnabled = !notifEnabled
    }
  }

  async function savePhone() {
    const value = phone.trim() || null
    phoneSaving = true
    try {
      await api.patch('/api/me', { phone: value })
      phoneSaved = value ?? ''
    } catch {
      phone = user?.phone ?? ''
    } finally {
      phoneSaving = false
    }
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      pushState = 'unsupported'
      return
    }
    if (Notification.permission === 'denied') {
      pushState = 'denied'
      return
    }
    pushBusy = true
    try {
      const ok = await subscribeToPush()
      const after = Notification.permission as string
      pushState = ok ? 'subscribed' : after === 'denied' ? 'denied' : 'idle'
    } finally {
      pushBusy = false
    }
  }

  async function handleLogout() {
    await logout()
    navigate('home')
  }
</script>

<main class="px-4 py-4">
  <h1 class="text-xl font-bold mb-6">{t('settings.title')}</h1>

  {#if user}
    <section class="mb-6">
      <h2 class="text-sm font-semibold text-on-surface-variant mb-1 flex items-center gap-2">
        <User size={16} /> Account
      </h2>
      <div class="card px-4 py-3 space-y-3 text-sm">
        <p class="font-semibold">{user.firstName || user.email}</p>
        <p class="text-on-surface-variant text-xs">{user.email}</p>
        <span class="badge {user.role === 'admin' ? 'badge-positive' : 'badge-neutral'}">
          {user.role === 'admin' ? t('admin.role.admin') : user.role === 'business' ? t('admin.role.business') : user.role === 'cashier' ? t('admin.role.cashier') : t('admin.role.client')}
        </span>
        <div>
          <label for="set-phone" class="field-label">{t('settings.phone')}</label>
          <input
            id="set-phone"
            bind:value={phone}
            type="tel"
            placeholder={t('settings.phone_placeholder')}
            class="input-field"
          />
          {#if phoneDirty}
            <button onclick={savePhone} disabled={phoneSaving} class="btn btn-primary w-full mt-2">
              {phoneSaving ? t('common.saving') : t('common.save')}
            </button>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  {#if user}
    <section class="mb-6">
      <h2 class="text-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
        <Bell size={16} /> {t('settings.notifications')}
      </h2>
      <div class="card divide-y divide-outline">
        <div class="flex items-center justify-between min-h-14 px-4 py-3">
          <div class="min-w-0 pe-3">
            <p class="text-sm font-medium">{t('settings.notifications.enable')}</p>
            <p class="text-xs text-on-surface-variant mt-0.5">{t('settings.notifications.enable_desc')}</p>
          </div>
          <button
            role="switch"
            aria-checked={notifEnabled}
            aria-label={t('settings.notifications.enable')}
            onclick={toggleNotifications}
            class="relative w-11 h-6 rounded-full transition-colors shrink-0 {notifEnabled ? 'bg-primary' : 'bg-surface-container'}"
          >
            <span class="absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform {notifEnabled ? 'translate-x-5' : ''}"></span>
          </button>
        </div>
        {#if VAPID_PUBLIC_KEY}
          <div class="flex items-center justify-between min-h-14 px-4 py-3">
            <div class="min-w-0 pe-3">
              <p class="text-sm font-medium">{t('settings.notifications.push')}</p>
              <p class="text-xs text-on-surface-variant mt-0.5">
                {pushState === 'subscribed' ? t('settings.notifications.push_on') : pushState === 'denied' ? t('settings.notifications.push_denied') : t('settings.notifications.push_desc')}
              </p>
            </div>
            {#if pushState === 'subscribed'}
              <BellRing size={20} class="text-primary shrink-0" />
            {:else}
              <button
                onclick={enablePush}
                disabled={pushBusy}
                class="btn btn-outline text-sm px-3 py-1.5 shrink-0 disabled:opacity-50"
              >
                {t('settings.notifications.push_enable')}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <section class="mb-6">
    <h2 class="text-sm font-semibold text-on-surface-variant mb-1 flex items-center gap-2">
      <Palette size={16} /> {t('settings.theme')}
    </h2>
    <p class="text-xs text-on-surface-variant mb-3">{t('settings.theme.desc')}</p>
    <div class="card p-1 flex gap-1">
      {#each themeOptions as opt}
        <button
          onclick={() => selectTheme(opt.value)}
          class="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors"
          class:bg-primary={themePref === opt.value}
          class:text-on-primary={themePref === opt.value}
          class:text-on-surface-variant={themePref !== opt.value}
          class:hover:bg-surface-container={themePref !== opt.value}
        >
          {t(opt.label)}
        </button>
      {/each}
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
      <Globe size={16} /> {t('settings.language')}
    </h2>
    <div class="card divide-y divide-outline">
      {#each locales as l}
        <button
          onclick={() => switchLocale(l)}
          class="flex items-center justify-between w-full min-h-14 px-4 py-3 text-sm text-left hover:bg-surface-container transition-colors"
          class:font-bold={l === locale}
        >
          <span class="flex items-center gap-2.5">
            <LocaleFlag locale={l} class="w-6 h-4" />
            {l === 'en' ? 'English' : l === 'fr' ? 'Français' : 'العربية'}
          </span>
          {#if l === locale}
            <span class="text-primary">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  </section>

  <section class="mb-6">
    <div class="flex flex-col gap-1 text-sm">
      <span class="text-on-surface-variant">{t('settings.contact')}</span>
      <a href="mailto:hello@fidelito.tn" class="text-primary hover:underline">hello@fidelito.tn</a>
      <a href="tel:+21627832488" class="text-primary hover:underline">+216 27 832 488</a>
    </div>
    <p class="text-xs text-on-surface-variant mt-3">{t('settings.copyright').replace('{year}', String(new Date().getFullYear()))}</p>
    <p class="text-xs text-on-surface-variant mt-1">v{VERSION}</p>
  </section>

  {#if user}
    <button onclick={handleLogout} class="btn btn-ghost flex items-center gap-2 text-secondary text-sm font-semibold px-4 py-2">
      <LogOut size={16} /> {t('nav.logout')}
    </button>
  {:else}
    <button onclick={() => navigate('register')} class="btn btn-ghost flex items-center gap-2 text-primary text-sm font-semibold px-4 py-2">
      <UserPlus size={16} /> {t('nav.signup')}
    </button>
  {/if}
</main>