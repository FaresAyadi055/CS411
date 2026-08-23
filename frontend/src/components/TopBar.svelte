<script lang="ts">
  import { Settings, Store, Bell } from '@lucide/svelte'
  import { navigate, getRoute } from '../stores/router.svelte'
  import { t } from '../lib/i18n.svelte'
  import { getUser } from '../stores/auth.svelte'
  import { notif, refreshUnread } from '../stores/notifications.svelte'
  import Tooltip from './Tooltip.svelte'
  import LocaleFlag from './LocaleFlag.svelte'
  import type { Locale } from '../lib/i18n.svelte'

  let { locale, locales, onLocaleChange }: {
    locale: Locale
    locales: Locale[]
    onLocaleChange: (l: Locale) => void
  } = $props()

  let showLang = $state(false)

  $effect(() => {
    if (getUser()?.role === 'client') refreshUnread()
  })

  function getLabel(l: Locale) {
    return l === 'en' ? 'EN' : l === 'fr' ? 'FR' : 'AR'
  }
</script>

<header class="bg-surface-card border-b border-outline sticky top-0 z-40 w-full">
  <div class="flex items-center justify-between px-4 h-12 w-full">
    <button onclick={() => navigate('home')} class="flex items-center gap-2 min-w-0">
      <img src="/favicon.svg" alt="" class="w-7 h-7 shrink-0" width="28" height="28" />
      <span class="font-bold text-lg text-primary tracking-tight truncate">{t('app.name')}</span>
    </button>

    <div class="flex items-center gap-1 shrink-0">
      {#if getUser()}
        {#if getUser()?.role === 'business'}
        <Tooltip text={t('business.profile.title')} position="bottom">
          <button
            onclick={() => navigate('business-profile')}
            class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            class:text-primary={getRoute() === 'business-profile'}
            aria-label={t('business.profile.title')}
          >
            <Store size={18} />
          </button>
        </Tooltip>
      {/if}

      {#if getUser()?.role === 'client'}
        <Tooltip text={t('nav.notifications')} position="bottom">
          <button
            onclick={() => navigate('notifications')}
            class="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            class:text-primary={getRoute() === 'notifications'}
            aria-label={t('nav.notifications')}
          >
            <Bell size={18} />
            {#if notif.unreadCount > 0}
              <span class="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
                {notif.unreadCount > 99 ? '99+' : notif.unreadCount}
              </span>
            {/if}
          </button>
        </Tooltip>
      {/if}

        <Tooltip text={t('nav.settings')} position="bottom">
          <button
            onclick={() => navigate('settings')}
            class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            class:text-primary={getRoute() === 'settings'}
            aria-label={t('nav.settings')}
          >
            <Settings size={18} />
          </button>
        </Tooltip>
      {/if}

      <div class="relative">
        <button
          onclick={() => { showLang = !showLang }}
          class="flex items-center gap-1.5 text-sm text-on-surface-variant font-medium px-2 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
        >
          <LocaleFlag locale={locale} class="w-5 h-3.5" />
          <span>{getLabel(locale)}</span>
        </button>
        {#if showLang}
          <div class="absolute top-full end-0 mt-1 bg-surface-card border border-outline rounded-lg elevated-shadow z-50 min-w-[7rem] overflow-hidden">
            {#each locales as l}
              <button
                onclick={() => { onLocaleChange(l); showLang = false }}
                class="flex items-center gap-2 w-full text-start px-3 py-2 text-sm hover:bg-surface-container transition-colors"
                class:font-bold={l === locale}
                class:text-primary={l === locale}
              >
                <LocaleFlag locale={l} class="w-5 h-3.5" />
                {getLabel(l)}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>