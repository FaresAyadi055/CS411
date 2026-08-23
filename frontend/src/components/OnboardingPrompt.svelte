<script lang="ts">
  import { t } from '../lib/i18n.svelte'
  import {
    pwa,
    shouldShowInstall,
    shouldShowNotif,
    promptInstall,
    markInstallAsked,
    markNotifAsked,
  } from '../lib/pwa.svelte'
  import { subscribeToPush } from '../lib/push'
  import { showToast } from '../stores/toast.svelte'
  import { Download, Bell, X, Check } from '@lucide/svelte'

  let step = $derived(shouldShowInstall() ? 'install' : shouldShowNotif() ? 'notifications' : null)
  let busy = $state(false)

  async function installNow() {
    const res = await promptInstall()
    if (res === 'accepted') {
      await proceed()
    } else if (res === 'dismissed') {
      await proceed()
    }
  }

  function skipInstall() {
    markInstallAsked()
    void proceed()
  }

  async function proceed() {
    if (shouldShowNotif()) return
    step = null
  }

  async function enableNotifications() {
    busy = true
    const ok = await subscribeToPush()
    pwa.notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    busy = false
    markNotifAsked()
    if (ok) showToast('success', t('onboarding.notifications.enabled'))
    step = null
  }

  function skipNotifications() {
    markNotifAsked()
    step = null
  }
</script>

{#if step}
  <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0"
       role="dialog" aria-modal="true">
    <div class="card w-full max-w-sm p-5 space-y-4 animate-slide-up">
      {#if step === 'install'}
        <div class="flex items-start gap-3">
          <div class="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Download size={22} />
          </div>
          <div class="flex-1">
            <h2 class="font-bold text-base">{t('onboarding.install.title')}</h2>
            <p class="text-sm text-on-surface-variant mt-1">{t('onboarding.install.desc')}</p>
            {#if pwa.isIos && !pwa.deferredPrompt}
              <p class="text-xs text-on-surface-variant mt-2">{t('onboarding.install.ios')}</p>
            {/if}
          </div>
          <button onclick={skipInstall} class="text-on-surface-variant shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div class="flex gap-2">
          {#if pwa.deferredPrompt}
            <button onclick={installNow} class="btn btn-primary flex-1">
              <Download size={16} class="mr-2" />{t('onboarding.install.action')}
            </button>
          {:else}
            <button onclick={skipInstall} class="btn btn-primary flex-1">
              <Check size={16} class="mr-2" />{t('onboarding.done')}
            </button>
          {/if}
          <button onclick={skipInstall} class="btn btn-ghost">{t('onboarding.not_now')}</button>
        </div>
      {:else}
        <div class="flex items-start gap-3">
          <div class="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Bell size={22} />
          </div>
          <div class="flex-1">
            <h2 class="font-bold text-base">{t('onboarding.notifications.title')}</h2>
            <p class="text-sm text-on-surface-variant mt-1">{t('onboarding.notifications.desc')}</p>
          </div>
          <button onclick={skipNotifications} class="text-on-surface-variant shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div class="flex gap-2">
          <button onclick={enableNotifications} disabled={busy} class="btn btn-primary flex-1">
            <Bell size={16} class="mr-2" />{t('onboarding.notifications.action')}
          </button>
          <button onclick={skipNotifications} class="btn btn-ghost">{t('onboarding.not_now')}</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-up { animation: slide-up 0.25s ease-out; }
</style>
