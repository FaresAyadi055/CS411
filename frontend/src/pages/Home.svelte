<script lang="ts">
  import { QrCode, ScanLine, Gift, BarChart3, ArrowRight, Mail, Phone, Check, Sparkles, Download } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import StarBadge from '../components/StarBadge.svelte'
  import PartnersCarousel from '../components/PartnersCarousel.svelte'
  import { pwa, promptInstall } from '../lib/pwa.svelte'

  const features = [
    { icon: QrCode, key: 'qr' },
    { icon: ScanLine, key: 'stamp' },
    { icon: Gift, key: 'rewards' },
    { icon: BarChart3, key: 'analytics' },
  ]

  const stampSlots = [true, true, true, true, true, true, false, false]

  async function installApp() {
    await promptInstall()
  }
</script>

<main class="pb-2 lg:pb-8 overflow-x-hidden">
  <section class="relative mx-4 mt-3 overflow-hidden rounded-2xl min-h-[280px] sm:min-h-[320px] lg:mx-6 lg:mt-5 lg:min-h-[420px] lg:rounded-[2rem] aurora-flow lg:grid lg:grid-cols-2 lg:items-center lg:gap-6">
    <div class="absolute inset-0 overflow-hidden">
      <div class="aurora aurora-1 -top-24 -left-16 h-72 w-72 bg-[#6cf8bb] opacity-50"></div>
      <div class="aurora aurora-2 -top-10 -right-20 h-80 w-80 bg-[#00b37a] opacity-50"></div>
      <div class="aurora aurora-3 -bottom-28 left-1/4 h-72 w-72 bg-[#9ff5cd] opacity-40"></div>
    </div>

    <div class="relative z-10 px-5 pt-12 pb-8 sm:pt-16 text-center text-white lg:px-12 lg:py-16 lg:text-start">
      <span class="badge inline-flex gap-1.5 bg-white/10 text-white animate-fade-in-up" style="animation-delay: 0ms">
        <Sparkles size={14} />
        {t('home.hero.badge')}
      </span>
      <h1 class="text-2xl sm:text-3xl font-bold leading-tight mb-2 mt-3 lg:text-4xl lg:mb-3 animate-fade-in-up" style="animation-delay: 100ms">{t('home.hero.title')}</h1>
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
          onclick={() => navigate('register')}
          class="btn bg-white/15 border border-white/30 text-white hover:bg-white/25"
        >
          {t('auth.sign.in')}
        </button>
      </div>
      {#if !pwa.installed}
        <div class="mt-3 flex justify-center animate-fade-in-up" style="animation-delay: 400ms">
          <button
            onclick={installApp}
            class="inline-flex items-center gap-2 text-white font-semibold underline"
          >
            <Download size={16} />
            {t('qr.install.title')}
          </button>
        </div>
      {/if}
    </div>

    <div class="relative z-10 flex justify-center px-6 pb-10 pt-2 sm:pb-14 lg:pb-0 lg:pt-0">
      <div class="relative animate-fade-in-up" style="animation-delay: 400ms">
        <div class="stamp-card w-56 sm:w-64">
          <div class="flex items-center justify-between mb-4">
            <span class="flex items-center gap-1.5 font-bold text-[#00A63E] text-sm">
              <StarBadge size={22} star={12} />
              {t('app.name')}
            </span>
            <span class="badge badge-positive text-[10px]">+50 pts</span>
          </div>
          <div class="grid grid-cols-4 gap-2 sm:gap-2.5">
            {#each stampSlots as filled}
              <div class="stamp-slot" class:filled>
                {#if filled}
                  <Check size={14} class="text-white" />
                {:else}
                  <span class="stamp-slot-dot"></span>
                {/if}
              </div>
            {/each}
          </div>
          <p class="text-[11px] sm:text-xs text-on-surface-variant mt-4">{t('home.hero.stampcard.progress', { count: '6', total: '8' })}</p>
        </div>
        <div class="floating-chip">
          <Gift size={13} />
          {t('home.hero.stampcard.reward')}
        </div>
      </div>
    </div>
  </section>

  <section class="px-4 mt-8 lg:px-6 lg:mt-12">
    <div class="text-center mb-4 animate-fade-in-up" style="animation-delay: 500ms">
      <h2 class="text-lg font-bold tracking-tight lg:text-xl">{t('home.features.title')}</h2>
      <p class="text-on-surface-variant text-xs mt-1 lg:text-sm">{t('home.features.subtitle')}</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
      {#each features as f, i}
        <div class="card p-4 lg:p-5 hover-lift animate-slide-up" style="animation-delay: {600 + i * 80}ms">
          <div class="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-primary bg-primary/10 lg:w-12 lg:h-12">
            <f.icon size={20} />
          </div>
          <h3 class="font-semibold text-sm mb-1 lg:text-base">{t(`home.feature.${f.key}`)}</h3>
          <p class="text-on-surface-variant text-xs leading-relaxed lg:text-sm">{t(`home.feature.${f.key}.desc`)}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="px-4 mt-8 lg:px-6 lg:mt-12">
    <div class="text-center mb-4 animate-fade-in-up" style="animation-delay: 900ms">
      <h2 class="text-lg font-bold tracking-tight lg:text-xl">{t('home.how.title')}</h2>
      <p class="text-on-surface-variant text-xs mt-1 lg:text-sm">{t('home.how.subtitle')}</p>
    </div>
    <div class="relative max-w-lg mx-auto lg:max-w-none">
      {#each ['step1', 'step2', 'step3'] as step, i}
        <div class="flex items-start gap-4 pb-5 last:pb-0 animate-slide-up" style="animation-delay: {1000 + i * 100}ms">
          <div class="flex flex-col items-center shrink-0">
            <span class="w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center justify-center shadow-sm">{i + 1}</span>
            {#if i < 2}
              <span class="w-px flex-1 min-h-6 bg-outline mt-1"></span>
            {/if}
          </div>
          <p class="text-sm text-on-surface leading-relaxed pt-1">{t(`home.how.${step}`)}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="px-4 mt-8 lg:px-6 lg:mt-12">
    <div class="relative overflow-hidden rounded-2xl lg:rounded-[1.75rem] bg-gradient-to-br from-primary to-primary-container px-6 py-8 text-center text-white lg:px-12 lg:py-10 animate-fade-in-up" style="animation-delay: 1300ms">
      <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 85% 25%, rgba(255,255,255,0.4) 0, transparent 40%);"></div>
      <div class="relative z-10">
        <h2 class="text-lg font-bold lg:text-2xl mb-1.5">{t('home.cta.title')}</h2>
        <p class="text-sm text-white/90 max-w-md mx-auto mb-5 lg:text-base">{t('home.cta.subtitle')}</p>
        <button
          onclick={() => navigate('register')}
          class="btn bg-white text-primary hover:bg-white/90 group mx-auto"
        >
          {t('home.get.started')}
          <ArrowRight size={16} class="ml-1 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  </section>

  <PartnersCarousel />

  <section class="px-4 mt-8 lg:px-6 lg:mt-12">
    <div class="card p-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm lg:p-5 lg:gap-6 animate-fade-in-up" style="animation-delay: 1500ms">
      <span class="text-on-surface-variant flex items-center gap-2">
        <Mail size={16} />
        {t('home.contact')}
      </span>
      <a href="mailto:hello@fidelito.tn" class="flex items-center gap-2 text-primary font-semibold hover:underline">
        hello@fidelito.tn
      </a>
      <a href="tel:+21627832488" class="flex items-center gap-2 text-primary font-semibold hover:underline">
        <Phone size={16} />
        +216 27 832 488
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
  @keyframes card-float {
    0%, 100% { transform: rotate(-3deg) translateY(0); }
    50% { transform: rotate(-3deg) translateY(-8px); }
  }
  @keyframes chip-bounce {
    0%, 100% { transform: translateY(0) rotate(3deg); }
    50% { transform: translateY(-5px) rotate(3deg); }
  }
  .animate-fade-in-up { animation: fade-in-up 0.4s ease-out both; }
  .animate-slide-up { animation: slide-up 0.4s ease-out both; }

  .stamp-card {
    background: var(--color-surface-card);
    border-radius: var(--radius-xl);
    box-shadow: 0 16px 40px rgba(19, 27, 46, 0.22);
    padding: 1.25rem;
    animation: card-float 5s ease-in-out infinite;
  }
  .stamp-slot {
    aspect-ratio: 1;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-container);
    border: 1px dashed var(--color-outline);
  }
  .stamp-slot.filled {
    background: var(--color-primary);
    border-style: solid;
    border-color: var(--color-primary);
  }
  .stamp-slot-dot {
    width: 4px;
    height: 4px;
    border-radius: 9999px;
    background: var(--color-outline-variant);
  }
  .floating-chip {
    position: absolute;
    bottom: -0.75rem;
    right: -0.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: var(--color-surface-card);
    color: var(--color-primary);
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 0.4rem 0.75rem;
    border-radius: 9999px;
    box-shadow: 0 8px 20px rgba(19, 27, 46, 0.18);
    animation: chip-bounce 2.6s ease-in-out infinite;
  }
  :global([dir='rtl']) .floating-chip {
    right: auto;
    left: -0.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in-up, .animate-slide-up, .stamp-card, .floating-chip {
      animation: none !important;
    }
  }
</style>
