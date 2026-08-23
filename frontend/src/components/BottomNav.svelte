<script lang="ts">
  import { QrCode, CreditCard, ScanLine, LayoutDashboard, Gift, Receipt, ArrowLeftRight, ShieldCheck, Users, Coins, Building2 } from '@lucide/svelte'
  import { t } from '../lib/i18n.svelte'
  import { navigate, getRoute } from '../stores/router.svelte'
  import { getUser } from '../stores/auth.svelte'
  import { isClientView, toggleClientView } from '../stores/mode.svelte'
  import { getBusinessPoints } from '../stores/businessPoints.svelte'

  interface NavItem {
    route: string
    icon: typeof QrCode
    labelKey: string
    params?: Record<string, string>
    switch?: boolean
    counter?: boolean
  }

  const items: NavItem[] = $derived.by(() => {
    const user = getUser()
    if (!user) return []

    if (user.role === 'admin') {
      return [{ route: 'admin', icon: ShieldCheck, labelKey: 'nav.admin', params: { section: 'overview' } }]
    }

    const canSwitch = user.role === 'business' || user.role === 'cashier'

    if (canSwitch && isClientView()) {
      return [
        { route: 'partners', icon: Building2, labelKey: 'nav.partners' },
        { route: 'qr', icon: QrCode, labelKey: 'nav.qr' },
        { route: 'cards', icon: CreditCard, labelKey: 'nav.cards' },
        { route: 'transactions', icon: Receipt, labelKey: 'nav.transactions' },
        { route: 'switch', icon: ArrowLeftRight, labelKey: 'nav.switch_business', switch: true },
      ]
    }

    if (user.role === 'business') {
      return [
        { route: 'scan', icon: ScanLine, labelKey: 'nav.scan' },
        { route: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
        { route: 'rewards', icon: Gift, labelKey: 'nav.rewards' },
        { route: 'staff', icon: Users, labelKey: 'nav.staff' },
        { route: 'switch', icon: ArrowLeftRight, labelKey: 'nav.switch_client', switch: true },
      ]
    }

    if (user.role === 'cashier') {
      return [
        { route: 'scan', icon: ScanLine, labelKey: 'nav.scan' },
        { route: 'points', icon: Coins, labelKey: 'nav.points', counter: true },
        { route: 'switch', icon: ArrowLeftRight, labelKey: 'nav.switch_client', switch: true },
      ]
    }

    return [
      { route: 'partners', icon: Building2, labelKey: 'nav.partners' },
      { route: 'qr', icon: QrCode, labelKey: 'nav.qr' },
      { route: 'cards', icon: CreditCard, labelKey: 'nav.cards' },
      { route: 'transactions', icon: Receipt, labelKey: 'nav.transactions' },
    ]
  })

  function handleClick(item: NavItem) {
    if (item.switch) {
      const wasClient = isClientView()
      toggleClientView()
      if (wasClient) {
        const user = getUser()
        navigate(user?.role === 'cashier' ? 'scan' : 'dashboard')
      } else {
        navigate('qr')
      }
      return
    }
    navigate(item.route as any, (item as any).params || {})
  }

  function isActive(item: NavItem) {
    return getRoute() === item.route
  }
</script>

{#if items.length > 0}
  <nav class="fixed bottom-0 inset-x-0 z-50 bg-surface-card border-t border-outline safe-area-bottom">
    <div class="mx-auto max-w-2xl flex">
      {#each items as item (item.route)}
        {#if item.counter}
          <button
            onclick={() => navigate('points')}
            aria-label={t(item.labelKey)}
            class="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] py-1.5 text-primary transition-all duration-200"
            class:text-primary={isActive(item)}
            class:text-on-surface-variant={!isActive(item)}
          >
            {#if isActive(item)}
              <span class="absolute top-0 h-0.5 w-10 rounded-full bg-primary animate-slide-in"></span>
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <item.icon size={20} strokeWidth={2.5} />
              </span>
            {:else}
              <span class="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container transition-colors">
                <item.icon size={20} strokeWidth={2} />
              </span>
            {/if}
            <span class="text-[10px] font-bold leading-tight">{getBusinessPoints() ?? '—'} {t(item.labelKey)}</span>
          </button>
        {:else}
          <button
            onclick={() => handleClick(item)}
            aria-label={t(item.labelKey)}
            aria-current={isActive(item) ? 'page' : undefined}
            class="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] py-1.5 transition-all duration-200"
            class:text-primary={isActive(item)}
            class:text-on-surface-variant={!isActive(item)}
          >
            {#if isActive(item)}
              <span class="absolute top-0 h-0.5 w-10 rounded-full bg-primary animate-slide-in"></span>
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <item.icon size={20} strokeWidth={2.5} />
              </span>
            {:else}
              <span class="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container transition-colors">
                <item.icon size={20} strokeWidth={2} />
              </span>
            {/if}
            <span class="text-[10px] font-semibold leading-tight">
              {t(item.labelKey)}
            </span>
          </button>
        {/if}
      {/each}
    </div>
  </nav>
{/if}

<style>
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  @keyframes slide-in {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
  .animate-slide-in {
    animation: slide-in 0.2s ease-out;
  }
</style>
