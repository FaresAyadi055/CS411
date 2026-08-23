<script lang="ts">
  import { QrCode, ScanLine, Gift, BarChart3, ArrowRight, Mail } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'

  const features = [
    { icon: QrCode, key: 'qr' },
    { icon: ScanLine, key: 'stamp' },
    { icon: Gift, key: 'rewards' },
    { icon: BarChart3, key: 'analytics' },
  ]
</script>

<main class="pb-2 lg:pb-8">
  <section class="relative mx-4 mt-3 overflow-hidden rounded-2xl min-h-[280px] sm:min-h-[320px] lg:mx-6 lg:mt-5 lg:min-h-[380px] lg:rounded-[2rem] bg-gradient-to-br from-primary to-primary-container">
    <div class="absolute inset-0 opacity-25" style="background-image: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25) 0, transparent 45%);"></div>
    <div class="relative z-10 px-5 py-12 sm:py-16 text-center text-white lg:px-12 lg:py-16 lg:text-start lg:max-w-2xl">
      <span class="badge inline-flex gap-1.5 bg-white/10 text-white animate-fade-in-up" style="animation-delay: 0ms">
        <QrCode size={14} />
        Digital Loyalty
      </span>
      <h1 class="text-2xl sm:text-3xl font-bold leading-tight mb-2 lg:text-4xl lg:mb-3 animate-fade-in-up" style="animation-delay: 100ms">{t('home.hero.title')}</h1>
      <p class="text-sm text-white/90 leading-relaxed max-w-md mx-auto lg:mx-0 lg:text-base animate-fade-in-up" style="animation-delay: 200ms">{t('home.hero.subtitle')}</p>
      <div class="mt-6 flex gap-3 justify-center flex-wrap lg:justify-start animate-fade-in-up" style="animation-delay: 300ms">
        <button
          onclick={() => navigate('register')}
          class="btn bg-white text-primary hover:bg-white/90 group"
        >
          {t('home.get.started')}
          <ArrowRight size={16} class="ml-1 transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onclick={() => navigate('login')}
          class="btn bg-white/15 border border-white/30 text-white hover:bg-white/25"
        >
          {t('auth.sign.in')}
        </button>
      </div>
    </div>
  </section>

  <section class="px-4 mt-6 lg:px-6 lg:mt-10">
    <h2 class="text-lg font-bold tracking-tight mb-3 lg:text-xl animate-fade-in-up" style="animation-delay: 400ms">{t('home.features.title')}</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
      {#each features as f, i}
        <div class="card p-4 lg:p-5 animate-slide-up" style="animation-delay: {500 + i * 80}ms">
          <div class="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-primary bg-primary/10 lg:w-12 lg:h-12">
            <f.icon size={20} />
          </div>
          <h3 class="font-semibold text-sm mb-1 lg:text-base">{t(`home.feature.${f.key}`)}</h3>
          <p class="text-on-surface-variant text-xs leading-relaxed lg:text-sm">{t(`home.feature.${f.key}.desc`)}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="px-4 mt-6 lg:px-6 lg:mt-10">
    <h2 class="text-lg font-bold tracking-tight mb-3 lg:text-xl animate-fade-in-up" style="animation-delay: 800ms">{t('home.how.title')}</h2>
    <div class="card overflow-hidden divide-y divide-outline">
      {#each ['step1', 'step2', 'step3'] as step, i}
        <div class="flex items-center gap-4 p-4 lg:p-5 animate-slide-up" style="animation-delay: {900 + i * 100}ms">
          <span class="shrink-0 w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center justify-center">{i + 1}</span>
          <p class="text-sm text-on-surface leading-relaxed">{t(`home.how.${step}`)}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="px-4 mt-8 lg:px-6 lg:mt-12">
    <div class="card p-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm lg:p-5 lg:gap-6 animate-fade-in-up" style="animation-delay: 1200ms">
      <span class="text-on-surface-variant flex items-center gap-2">
        <Mail size={16} />
        {t('home.contact')}
      </span>
      <a href="mailto:hello@fidelito.tn" class="flex items-center gap-2 text-primary font-semibold hover:underline">
        hello@fidelito.tn
      </a>
    </div>
  </section>
</main>

<style>
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up { animation: fade-in-up 0.4s ease-out both; }
  .animate-slide-up { animation: slide-up 0.4s ease-out both; }
</style>
