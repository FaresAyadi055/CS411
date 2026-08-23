<script lang="ts">
  import { onMount } from 'svelte'
  import { Building2, Gift, Users } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
  import api from '../lib/api'
  import { showToast } from '../stores/toast.svelte'
  import StarBadge from '../components/StarBadge.svelte'

  type Partner = {
    id: string
    name: string
    logoUrl: string | null
    address: string | null
    clientsCount: number
    rewardsCount: number
    subscribed: boolean
  }

  let partners = $state<Partner[]>([])
  let loading = $state(true)
  let subscribingId = $state<string | null>(null)

  onMount(async () => {
    try {
      const data = await api.get<{ merchants: Partner[] }>('/api/client/merchants')
      partners = data.merchants
    } catch {}
    loading = false
  })

  async function subscribe(p: Partner) {
    subscribingId = p.id
    try {
      await api.post('/api/client/subscribe', { merchantId: p.id })
      p.subscribed = true
      p.clientsCount += 1
      showToast('success', t('partners.subscribed_to', { name: p.name }))
    } catch (e: any) {
      showToast('error', e.message || t('partners.subscribe_error'))
    } finally {
      subscribingId = null
    }
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="mb-6 animate-fade-in">
    <h1 class="text-xl font-bold">{t('partners.title')}</h1>
  </div>

  {#if loading}
    <div class="space-y-3">
      {#each [1, 2, 3] as _}
        <div class="card p-4 animate-pulse flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-surface-container-high"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-surface-container-high rounded w-1/3"></div>
            <div class="h-3 bg-surface-container-high rounded w-1/2"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if partners.length === 0}
    <div class="card p-8 text-center">
      <Building2 size={28} class="text-on-surface-variant mx-auto mb-2" />
      <p class="text-sm text-on-surface-variant">{t('partners.empty')}</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each partners as p, i (p.id)}
        <div
          class="card p-4 w-full text-left flex items-center gap-3 hover:bg-surface-container-low transition-all duration-200 animate-slide-up"
          style="animation-delay: {i * 40}ms"
        >
          <button
            onclick={() => navigate('card', { merchantId: p.id })}
            class="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            {#if p.logoUrl}
              <img src={p.logoUrl} alt="" class="w-12 h-12 rounded-xl object-cover shrink-0" />
            {:else}
              <StarBadge size={48} star={22} />
            {/if}
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm truncate">{p.name || 'Partner'}</p>
              <p class="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                <Gift size={12} class="shrink-0" />
                {t('partners.rewards', { n: p.rewardsCount.toString() })}
              </p>
              <p class="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                <Users size={12} class="shrink-0" />
                {t('partners.clients', { n: p.clientsCount.toString() })}
              </p>
            </div>
          </button>
          {#if p.subscribed}
            <span class="text-xs text-found-text font-medium shrink-0">{t('partners.subscribed')}</span>
          {:else}
            <button
              onclick={(e) => { e.stopPropagation(); subscribe(p) }}
              disabled={subscribingId === p.id}
              class="btn btn-primary text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
            >
              {subscribingId === p.id ? t('common.loading') : t('partners.subscribe')}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fade-in 0.3s ease-out; }
  .animate-slide-up { animation: slide-up 0.3s ease-out both; }
</style>
