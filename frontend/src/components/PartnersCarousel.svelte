<script lang="ts">
  import { onMount } from 'svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import api from '../lib/api'
  import StarBadge from './StarBadge.svelte'

  type Partner = {
    id: string
    name: string
    logoUrl: string | null
    slug?: string
  }

  let partners = $state<Partner[]>([])
  let loading = $state(true)

  onMount(async () => {
    try {
      const data = await api.getPublic<{ merchants: Partner[] }>('/api/public/merchants')
      partners = data.merchants ?? []
    } catch {
      partners = []
    } finally {
      loading = false
    }
  })

  const shouldSpin = $derived(partners.length >= 4)
  const track = $derived(shouldSpin ? [...partners, ...partners] : partners)
</script>

{#if loading || partners.length > 0}
  <section class="px-4 mt-8 lg:px-6 lg:mt-12">
    <div class="text-center mb-5 animate-fade-in-up">
      <h2 class="text-lg font-bold tracking-tight lg:text-xl">{t('home.partners.title')}</h2>
      <p class="text-on-surface-variant text-xs mt-1 lg:text-sm">{t('home.partners.subtitle')}</p>
    </div>

    {#if loading}
      <div class="flex gap-6 justify-center overflow-hidden">
        {#each [1, 2, 3, 4] as _}
          <div class="flex flex-col items-center gap-2 shrink-0 w-20 animate-pulse">
            <div class="w-14 h-14 rounded-2xl bg-surface-container-high"></div>
            <div class="h-2.5 w-12 rounded-full bg-surface-container-high"></div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="partners-viewport" class:static-row={!shouldSpin}>
        <div class="partners-track" class:spin={shouldSpin}>
          {#each track as p, i (p.id + '-' + i)}
            <button
              type="button"
              onclick={() => navigate('card', { merchantId: p.id })}
              class="partner-item group"
            >
              <span class="partner-logo">
                {#if p.logoUrl}
                  <img src={p.logoUrl} alt={p.name} class="w-full h-full rounded-2xl object-cover" loading="lazy" />
                {:else}
                  <StarBadge size={56} star={26} />
                {/if}
              </span>
              <span class="partner-name">{p.name || 'Partner'}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up { animation: fade-in-up 0.4s ease-out both; }

  .partners-viewport {
    overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
    mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
  }
  .partners-viewport.static-row {
    -webkit-mask-image: none;
    mask-image: none;
  }

  .partners-track {
    display: flex;
    align-items: flex-start;
    gap: 2rem;
    width: max-content;
  }
  .partners-viewport.static-row .partners-track {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .partners-track.spin {
    animation: partners-scroll 26s linear infinite;
  }
  .partners-track.spin:hover,
  .partners-track.spin:focus-within {
    animation-play-state: paused;
  }

  @keyframes partners-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  .partner-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 5.5rem;
    flex-shrink: 0;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0.25rem;
  }
  .partner-logo {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-card);
    border: 1px solid var(--color-outline);
    overflow: hidden;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .partner-item:hover .partner-logo,
  .partner-item:focus-visible .partner-logo {
    transform: translateY(-3px);
    border-color: var(--color-primary);
    box-shadow: var(--shadow-elevated);
  }
  .partner-name {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-on-surface-variant);
    text-align: center;
    line-height: 1.15;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .partners-track.spin {
      animation: none;
    }
    .animate-fade-in-up {
      animation: none;
    }
  }
</style>
