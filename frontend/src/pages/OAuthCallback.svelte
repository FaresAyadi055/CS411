<script lang="ts">
  import { onMount } from 'svelte'
  import { resolveOAuthSession, getUser } from '../stores/auth.svelte'

  let message = $state('Completing sign in...')

  function getUrlError(): string | null {
    const params = new URLSearchParams(window.location.search)
    return params.get('error')
  }

  function getErrorMessage(err: string): string {
    if (err === 'account_not_linked') {
      return 'This social account is not linked to any account here. Try signing up first.'
    }
    if (err === 'access_denied') {
      return 'Sign in was cancelled.'
    }
    return 'Could not complete sign in.'
  }

  onMount(async () => {
    if (window.opener) {
      window.opener.postMessage({ type: 'appbase:oauth-done' }, window.location.origin)
      window.close()
      return
    }

    const urlError = getUrlError()
    if (urlError) {
      message = getErrorMessage(urlError)
      return
    }

    try {
      await resolveOAuthSession()
      if (!getUser()) {
        message = 'Sign in completed but could not load your profile. Try again.'
      }
    } catch (e) {
      message = getErrorMessage((e as Error).message)
    }
  })
</script>

<main class="min-h-screen flex items-center justify-center px-4">
  <div class="text-on-surface-variant">{message}</div>
</main>