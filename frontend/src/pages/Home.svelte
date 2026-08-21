<script lang="ts">
  import { KeyRound, Users, Languages, Moon, Mail, Rocket } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'

  const features = [
    { icon: KeyRound, key: 'auth' },
    { icon: Users, key: 'crud' },
    { icon: Languages, key: 'i18n' },
    { icon: Moon, key: 'theme' },
  ]
</script>

<main class="pb-2 lg:pb-8">
  <section class="relative mx-4 mt-3 overflow-hidden rounded-2xl min-h-[280px] sm:min-h-[320px] lg:mx-6 lg:mt-5 lg:min-h-[380px] lg:rounded-[2rem] bg-gradient-to-br from-primary to-primary-container">
    <div class="absolute inset-0 opacity-25" style="background-image: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25) 0, transparent 45%);"></div>
    <div class="relative z-10 px-5 py-12 sm:py-16 text-center text-white lg:px-12 lg:py-16 lg:text-start lg:max-w-2xl">
      <span class="badge inline-flex gap-1.5 bg-white/10 text-white">
        <Rocket size={14} />
        Starter kit
      </span>
      <h1 class="text-2xl sm:text-3xl font-bold leading-tight mb-2 lg:text-4xl lg:mb-3">{t('home.hero.title')}</h1>
      <p class="text-sm text-white/90 leading-relaxed max-w-md mx-auto lg:mx-0 lg:text-base">{t('home.hero.subtitle')}</p>
      <div class="mt-6 flex gap-3 justify-center flex-wrap lg:justify-start">
        <button
          onclick={() => navigate('login')}
          class="btn bg-white text-primary hover:bg-white/90"
        >
          {t('home.get.started')}
        </button>
        <button
          onclick={() => navigate('register')}
          class="btn bg-white/15 border border-white/30 text-white hover:bg-white/25"
        >
          {t('auth.sign.up')}
        </button>
      </div>
    </div>
  </section>

  <section class="px-4 mt-6 lg:px-6 lg:mt-10">
    <h2 class="text-lg font-bold tracking-tight mb-3 lg:text-xl">{t('home.features.title')}</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
      {#each features as f}
        <div class="card p-4 lg:p-5">
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
    <h2 class="text-lg font-bold tracking-tight mb-3 lg:text-xl">{t('home.how.title')}</h2>
    <div class="card overflow-hidden divide-y divide-outline">
      {#each ['step1', 'step2', 'step3'] as step, i}
        <div class="flex items-center gap-4 p-4 lg:p-5">
          <span class="shrink-0 w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center justify-center">{i + 1}</span>
          <p class="text-sm text-on-surface leading-relaxed">{t(`home.how.${step}`)}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="px-4 mt-8 lg:px-6 lg:mt-12">
    <div class="card p-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm lg:p-5 lg:gap-6">
      <span class="text-on-surface-variant flex items-center gap-2">
        <Mail size={16} />
        {t('home.contact')}
      </span>
      <a href="mailto:hello@example.com" class="flex items-center gap-2 text-primary font-semibold hover:underline">
        hello@example.com
      </a>
    </div>
  </section>
</main>