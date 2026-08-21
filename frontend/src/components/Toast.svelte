<script lang="ts">
  import { getToasts } from '../stores/toast.svelte'
  let toasts = $derived(getToasts())
</script>

{#if toasts.length > 0}
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
    {#each toasts as toast (toast.id)}
      <div
        class="px-4 py-3 rounded-lg elevated-shadow text-sm font-medium transition-all animate-slide-in"
        class:bg-primary={toast.type === 'success'}
        class:bg-secondary={toast.type === 'error'}
        class:bg-surface-container-high={toast.type === 'info'}
        class:bg-warning-bg={toast.type === 'warning'}
        class:text-on-primary={toast.type !== 'info' && toast.type !== 'warning'}
        class:text-on-surface={toast.type === 'info'}
        class:text-warning-text={toast.type === 'warning'}
      >
        {toast.message}
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-slide-in {
    animation: slide-in 0.2s ease-out;
  }
</style>
