<script lang="ts">
  let {
    text,
    position = 'top',
    children,
  }: {
    text: string
    position?: 'top' | 'bottom'
    children: import('svelte').Snippet
  } = $props()

  let visible = $state(false)
</script>

<div
  class="relative inline-flex"
  role="tooltip"
  onmouseenter={() => (visible = true)}
  onmouseleave={() => (visible = false)}
  onfocusin={() => (visible = true)}
  onfocusout={() => (visible = false)}
>
  {@render children()}
  <div
    class="absolute z-50 px-2 py-1 text-xs text-on-primary rounded whitespace-nowrap pointer-events-none shadow-sm bg-on-surface transition-opacity duration-150"
    class:opacity-0={!visible}
    class:opacity-100={visible}
    style={position === 'top'
      ? 'bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);'
      : 'top: calc(100% + 6px); left: 50%; transform: translateX(-50%);'}
  >
    {text}
  </div>
</div>
