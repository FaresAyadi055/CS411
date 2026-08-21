<script lang="ts">
  let {
    variant = 'text',
    repeat = 1,
    class: className = '',
  }: {
    variant?: 'text' | 'title' | 'avatar' | 'image' | 'card' | 'paragraph' | 'table-row'
    repeat?: number
    class?: string
  } = $props()
</script>

{#each Array(repeat) as _, i}
  {#if variant === 'text'}
    <div class="skeleton h-3 w-full rounded {className}" class:mt-2={i > 0}></div>
  {:else if variant === 'title'}
    <div class="skeleton h-5 w-2/3 rounded {className}" class:mt-4={i > 0}></div>
  {:else if variant === 'avatar'}
    <div class="skeleton rounded-full shrink-0 {className}" class:w-12={!className.includes('w-')} class:h-12={!className.includes('h-')}></div>
  {:else if variant === 'image'}
    <div class="skeleton aspect-[4/3] w-full rounded-lg {className}" class:mt-4={i > 0}></div>
  {:else if variant === 'card'}
    <div class="bg-surface-card rounded-lg border border-outline p-3 {className}" class:mt-3={i > 0}>
      <div class="flex items-center gap-3">
        <div class="skeleton w-12 h-12 rounded-full shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="skeleton h-4 w-2/3 rounded"></div>
          <div class="skeleton h-3 w-1/3 rounded"></div>
        </div>
      </div>
    </div>
  {:else if variant === 'paragraph'}
    <div class="space-y-2 {className}">
      <div class="skeleton h-3 w-full rounded"></div>
      <div class="skeleton h-3 w-5/6 rounded"></div>
      <div class="skeleton h-3 w-4/6 rounded"></div>
    </div>
  {:else if variant === 'table-row'}
    <div class="flex items-center gap-4 px-4 py-3.5 border-b border-outline {className}">
      <div class="skeleton w-4 h-4 rounded shrink-0"></div>
      <div class="skeleton h-4 w-16 rounded shrink-0"></div>
      <div class="skeleton h-4 flex-1 rounded"></div>
      <div class="skeleton w-12 h-12 rounded shrink-0"></div>
      <div class="skeleton h-4 w-20 rounded shrink-0"></div>
      <div class="skeleton h-5 w-14 rounded-full shrink-0"></div>
    </div>
  {/if}
{/each}

<style>
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--color-surface-container) 25%,
      var(--color-surface-container-high) 37%,
      var(--color-surface-container) 63%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
