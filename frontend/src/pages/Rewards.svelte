<script lang="ts">
  import { onMount } from 'svelte'
  import { Gift, Plus, Trash2, Pencil, X, Check, Upload, Image as ImageIcon } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import api from '../lib/api'
  import { showToast } from '../stores/toast.svelte'
  import StarBadge from '../components/StarBadge.svelte'
  import type { Reward } from '../lib/types'

  let rewards = $state<Reward[]>([])
  let loading = $state(true)
  let showAdd = $state(false)
  let editingId = $state<string | null>(null)
  let formTitle = $state('')
  let formCost = $state(10)
  let formImageUrl = $state<string | null>(null)
  let formFile = $state<File | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)
  let uploading = $state(false)
  let saving = $state(false)
  let error = $state('')

  onMount(async () => {
    try {
      const data = await api.get<{ rewards: Reward[] }>('/api/business/rewards')
      rewards = data.rewards
    } catch {}
    loading = false
  })

  function startAdd() {
    editingId = null
    formTitle = ''
    formCost = 10
    formImageUrl = null
    formFile = null
    showAdd = true
  }

  function startEdit(r: Reward) {
    editingId = r.id
    formTitle = r.title
    formCost = r.stampsCost
    formImageUrl = r.imageUrl ?? null
    formFile = null
    showAdd = true
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    uploading = true
    try {
      const data = await api.upload<{ url: string; id: string }>('/api/uploads/reward', file)
      formImageUrl = data.url
      formFile = file
    } catch (e: any) {
      showToast('error', e.message || 'Upload failed')
    } finally {
      uploading = false
      if (fileInput) fileInput.value = ''
    }
  }

  function removeImage() {
    formImageUrl = null
    formFile = null
  }

  async function saveReward() {
    if (!formTitle.trim()) return
    saving = true
    error = ''
    try {
      if (editingId) {
        await api.patch(`/api/business/rewards/${editingId}`, {
          title: formTitle.trim(),
          stampsCost: formCost,
          imageUrl: formImageUrl,
        })
      } else {
        await api.post('/api/business/rewards', {
          title: formTitle.trim(),
          stampsCost: formCost,
          imageUrl: formImageUrl ?? undefined,
        })
      }
      const data = await api.get<{ rewards: Reward[] }>('/api/business/rewards')
      rewards = data.rewards
      showAdd = false
    } catch (e: any) {
      error = e.message || 'Failed to save'
    } finally {
      saving = false
    }
  }

  async function deleteReward(id: string) {
    try {
      await api.delete(`/api/business/rewards/${id}`)
      rewards = rewards.filter(r => r.id !== id)
    } catch {}
  }
</script>

<main class="pb-28 px-4 pt-4 max-w-lg mx-auto">
  <div class="flex items-center justify-between mb-6 animate-fade-in">
    <h1 class="text-xl font-bold">{t('rewards.title')}</h1>
    <button onclick={startAdd} class="btn btn-primary !min-h-10 !px-3">
      <Plus size={18} />
    </button>
  </div>

  {#if showAdd}
    <div class="card p-4 mb-4 animate-slide-up">
      {#if error}
        <p class="text-lost-text text-sm mb-2">{error}</p>
      {/if}
      <form onsubmit={(e) => { e.preventDefault(); saveReward() }} class="space-y-3">
         <div>
           <label class="field-label" for="reward-title">{t('rewards.title_placeholder')}</label>
           <input id="reward-title" bind:value={formTitle} type="text" placeholder={t('rewards.title_placeholder')} class="input-field" required />
         </div>
         <div>
          <label class="field-label" for="reward-cost">{t('rewards.cost')}</label>
          <input id="reward-cost" bind:value={formCost} type="number" min="1" class="input-field" />
        </div>
        <div>
          <p class="field-label">{t('rewards.photo')}</p>
          {#if formImageUrl}
            <div class="relative w-24 h-24 rounded-xl overflow-hidden border border-outline mb-2">
              <img src={formImageUrl} alt="Reward" class="w-full h-full object-cover" />
              <button
                type="button"
                onclick={removeImage}
                class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
          {:else}
            <button
              type="button"
              onclick={() => fileInput?.click()}
              disabled={uploading}
              class="w-24 h-24 rounded-xl border-2 border-dashed border-outline flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors">
              {#if uploading}
                <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              {:else}
                <ImageIcon size={20} class="text-on-surface-variant" />
                <span class="text-[10px] text-on-surface-variant">{t('rewards.upload_photo')}</span>
              {/if}
            </button>
          {/if}
          <input
            bind:this={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onchange={handleFileSelect}
            class="hidden" />
        </div>
        <div class="flex gap-2">
          <button type="button" onclick={() => { showAdd = false; error = '' }} class="btn btn-ghost flex-1">{t('common.cancel')}</button>
          <button type="submit" disabled={saving || !formTitle.trim()} class="btn btn-primary flex-1">
            {saving ? t('common.loading') : t('common.confirm')}
          </button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <div class="space-y-2">
      {#each [1, 2] as _}
        <div class="card p-4 animate-pulse">
          <div class="h-4 bg-surface-container-high rounded w-1/3 mb-2"></div>
          <div class="h-3 bg-surface-container-high rounded w-1/2"></div>
        </div>
      {/each}
    </div>
  {:else if rewards.length === 0}
    <div class="card p-8 text-center">
      <Gift size={28} class="text-on-surface-variant mx-auto mb-2" />
      <p class="text-sm text-on-surface-variant">{t('rewards.empty')}</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each rewards as reward, i}
        <div class="card p-4 animate-slide-up" style="animation-delay: {i * 40}ms">
           <div class="flex items-start gap-3">
              {#if reward.imageUrl}
                <img src={reward.imageUrl} alt={reward.title} class="w-10 h-10 rounded-xl object-cover shrink-0 border border-outline" />
              {:else}
                <StarBadge size={40} star={18} />
              {/if}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold">{reward.title}</p>
                {#if reward.isAvailable}
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-found-bg text-found-text">{t('rewards.available')}</span>
                {:else}
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{t('rewards.unavailable')}</span>
                {/if}
              </div>
               <p class="text-xs text-primary font-semibold mt-1">{reward.stampsCost} stamps</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button onclick={() => startEdit(reward)} class="p-2 rounded-lg hover:bg-surface-container transition-colors">
                <Pencil size={14} class="text-on-surface-variant" />
              </button>
              <button onclick={() => deleteReward(reward.id)} class="p-2 rounded-lg hover:bg-lost-bg transition-colors">
                <Trash2 size={14} class="text-lost-text" />
              </button>
            </div>
          </div>
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
