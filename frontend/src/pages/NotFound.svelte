<script lang="ts">
  import { t } from '../lib/i18n.svelte'
  import { navigate } from '../stores/router.svelte'
</script>

<main class="min-h-screen flex flex-col items-center justify-center px-4 text-center">
  <div class="text-6xl font-bold text-surface-container-highest mb-4">404</div>
  <h1 class="text-xl font-bold mb-2">{t('error.not_found')}</h1>
  <p class="text-sm text-on-surface-variant mb-6">{t('error.not_found_desc')}</p>
  <button onclick={() => navigate('home')} class="btn btn-primary">{t('nav.home')}</button>
</main>
