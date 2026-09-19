<script lang="ts">
  import { Globe, LogOut, Palette, User, UserPlus } from '@lucide/svelte'
  import { getThemePreference, setTheme, type ThemePreference } from '../stores/theme.svelte'
  import { t, setLocale, getLocale, locales, type Locale } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import { getUser, logout } from '../stores/auth.svelte'
  import api from '../lib/api'
  import { VERSION } from '../lib/config'
  import LocaleFlag from '../components/LocaleFlag.svelte'

  let locale = $state(getLocale())
  let themePref = $state<ThemePreference>(getThemePreference())
  const user = $derived(getUser())

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

  async function handleLogout() {
    await logout()
    navigate('register')
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
          {user.role === 'admin' ? t('admin.role.admin') : user.role === 'business' ? t('admin.role.business') : t('admin.role.client')}
        </span>
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