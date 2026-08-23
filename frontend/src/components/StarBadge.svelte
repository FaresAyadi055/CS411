<script lang="ts">
  import { Star } from '@lucide/svelte'

  let { size = 48, star = 24 } = $props()
</script>

<div
  class="rounded-full bg-green-600 flex items-center justify-center shrink-0"
  style="width:{size}px;height:{size}px">
  <Star size={star} class="text-white" fill="currentColor" />
</div>
