<script lang="ts">
  import { onMount } from 'svelte'
  import './app.css'
  import { t, initLocale, setLocale, getLocale, locales } from './lib/i18n.svelte'
  import { initRouter, navigate, getRoute } from './stores/router.svelte'
  import { checkSession, getUser, resolveOAuthSession } from './stores/auth.svelte'
  import { syncViewMode } from './stores/mode.svelte'
  import api, { setOnRequestError } from './lib/api'
  import Home from './pages/Home.svelte'
  import Login from './pages/Login.svelte'
  import Register from './pages/Register.svelte'
  import ForgotPassword from './pages/ForgotPassword.svelte'
  import Settings from './pages/Settings.svelte'
  import About from './pages/About.svelte'
  import NotFound from './pages/NotFound.svelte'
  import OAuthCallback from './pages/OAuthCallback.svelte'
  import AdminDashboard from './pages/admin/Dashboard.svelte'
  import Qr from './pages/Qr.svelte'
  import Cards from './pages/Cards.svelte'
  import CardDetail from './pages/CardDetail.svelte'
  import Scan from './pages/Scan.svelte'
  import BizDashboard from './pages/BizDashboard.svelte'
  import Staff from './pages/Staff.svelte'
  import Rewards from './pages/Rewards.svelte'
  import BusinessProfile from './pages/BusinessProfile.svelte'
  import Transactions from './pages/Transactions.svelte'
  import Partners from './pages/Partners.svelte'
  import Notifications from './pages/Notifications.svelte'
  import TopBar from './components/TopBar.svelte'
  import BottomNav from './components/BottomNav.svelte'
  import Toast from './components/Toast.svelte'
  import Skeleton from './components/Skeleton.svelte'
  import OnboardingPrompt from './components/OnboardingPrompt.svelte'
  import { initPwa } from './lib/pwa.svelte'
  import { showToast } from './stores/toast.svelte'
  import LocaleFlag from './components/LocaleFlag.svelte'

  let ready = $state(false)
  let locale = $state(getLocale())
  let maintenance = $state(import.meta.env.VITE_MAINTENANCE === 'true')

  $effect(() => {
    getUser()
    syncViewMode()
  })

  function getLabel(l: typeof locales[number]) {
    return l === 'en' ? 'EN' : l === 'fr' ? 'FR' : 'AR'
  }

  async function switchLocale(l: typeof locales[number]) {
    setLocale(l)
    locale = getLocale()
    try {
      await api.patch('/api/me', { locale: l })
    } catch {}
  }

  const noNavRoutes = ['login', 'register', 'forgot-password', 'oauth-callback', 'not-found']

  function showTopBar() {
    return !noNavRoutes.includes(getRoute())
  }

  function showBottomNav() {
    return showTopBar()
  }

  onMount(() => {
    initLocale()
    locale = getLocale()
    initRouter()
    ready = true
    setOnRequestError((e) => showToast('error', e.message))
    initPwa()
    checkSession()
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'appbase:oauth-done' && e.source) {
        resolveOAuthSession()
      }
    })
  })
</script>

{#if !ready}
  <div class="min-h-screen bg-surface px-4 py-6 max-w-2xl mx-auto space-y-4">
    <Skeleton variant="title" />
    <Skeleton variant="image" />
    <Skeleton variant="card" repeat={3} />
  </div>
{:else if maintenance}
  <div class="maintenance">
    <div class="maintenance-card">
      <h2 class="app-title">{t('app.name')}</h2>
      <div class="lang-switcher">
        {#each locales as l}
          <button
            class:active={l === locale}
            onclick={() => switchLocale(l)}
          >
            <LocaleFlag locale={l} class="w-5 h-3.5" />
            {getLabel(l)}
          </button>
        {/each}
      </div>
      <span class="icon">&#9881;</span>
      <h1>{t('maintenance.title')}</h1>
      <p class="message">{t('maintenance.message')}</p>
    </div>
  </div>
{:else}
  {#if showTopBar()}
    <TopBar {locale} locales={locales} onLocaleChange={switchLocale} />
  {/if}
  <div
    class="min-h-screen bg-surface relative max-w-2xl mx-auto"
    class:max-w-none={getRoute() === 'admin'}
    class:mx-0={getRoute() === 'admin'}
    class:pb-28={showBottomNav()}
  >
    <Toast />

    {#if getRoute() === 'home'}
      <Home />
    {:else if getRoute() === 'login'}
      <Login />
    {:else if getRoute() === 'register'}
      <Register />
    {:else if getRoute() === 'forgot-password'}
      <ForgotPassword />
    {:else if getRoute() === 'about'}
      <About />
    {:else if getRoute() === 'settings'}
      {#if getUser()}
        <Settings />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'admin'}
      {#if getUser()}
        <AdminDashboard />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'qr'}
      {#if getUser()}
        <Qr />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'cards'}
      {#if getUser()}
        <Cards />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'card'}
      {#if getUser()}
        <CardDetail />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'scan'}
      {#if getUser()}
        <Scan />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'dashboard'}
      {#if getUser()}
        <BizDashboard />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'staff'}
      {#if getUser()}
        <Staff />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'rewards'}
      {#if getUser()}
        <Rewards />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'business-profile'}
      {#if getUser()}
        <BusinessProfile />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'transactions'}
      {#if getUser()}
        <Transactions />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'partners'}
      {#if getUser()}
        <Partners />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'notifications'}
      {#if getUser()}
        <Notifications />
      {:else}
        <Login />
      {/if}
    {:else if getRoute() === 'oauth-callback'}
      <OAuthCallback />
    {:else if getRoute() === 'not-found'}
      <NotFound />
    {/if}
  </div>
  {#if showBottomNav()}
    <BottomNav />
  {/if}
  <OnboardingPrompt />
{/if}

<style>
  .maintenance {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Segoe UI Historic', 'Noto Sans Arabic', sans-serif;
  }

  .maintenance-card {
    text-align: center;
    max-width: 480px;
  }

  .app-title {
    font-weight: 700;
    font-size: 1.5rem;
    color: #2563eb;
    margin-bottom: 1rem;
  }

  .lang-switcher {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .lang-switcher button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: transparent;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: #666;
    transition: all 0.2s;
  }

  .lang-switcher button.active {
    border-color: #333;
    color: #333;
    font-weight: 600;
  }

  .icon {
    font-size: 4rem;
    display: block;
    margin-bottom: 1.5rem;
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .message {
    font-size: 1.125rem;
    line-height: 1.6;
    color: #666;
  }
</style>
