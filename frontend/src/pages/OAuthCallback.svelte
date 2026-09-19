<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from '../stores/router.svelte'

  onMount(() => {
    navigate('register')
  })
</script>

<main class="min-h-screen flex items-center justify-center px-4">
  <div class="text-on-surface-variant">Redirecting...</div>
</main>
