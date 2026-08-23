export type Route =
  | 'home'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'about'
  | 'settings'
  | 'admin'
  | 'oauth-callback'
  | 'not-found'
  | 'qr'
  | 'cards'
  | 'card'
  | 'scan'
  | 'dashboard'
  | 'staff'
  | 'rewards'
  | 'business-profile'
  | 'partners'
  | 'transactions'
  | 'notifications'
  | 'points'

const NAMED_ROUTES: Route[] = [
  'home', 'login', 'register', 'forgot-password', 'about',
  'settings', 'oauth-callback', 'qr', 'cards', 'scan',
  'dashboard', 'staff', 'rewards', 'business-profile', 'partners', 'transactions', 'notifications', 'points',
]

const PREFIX_ROUTES = ['admin', 'card']

let currentRoute = $state<Route>('home')
let routeParams = $state<Record<string, string>>({})

function parseLocation(): { route: Route; params: Record<string, string> } {
  let hash = window.location.hash.replace(/^#\/?/, '')

  if (hash === '#_=_') hash = ''

  const parts = hash.split('/')
  const base = parts[0] || 'home'

  if (base === 'admin') {
    return { route: 'admin', params: { section: parts[1] || 'overview' } }
  }

  if (base === 'card') {
    return { route: 'card', params: { merchantId: parts[1] || '' } }
  }

  if (NAMED_ROUTES.includes(base as Route)) {
    return { route: base as Route, params: {} }
  }

  if (PREFIX_ROUTES.includes(base)) {
    return { route: 'admin', params: { section: parts[1] || 'overview' } }
  }

  return { route: 'not-found', params: {} }
}

function stripTrackingParams() {
  const url = new URL(window.location.href)
  const tracking = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  let changed = false
  for (const key of tracking) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (url.hash === '#_=_') {
    url.hash = ''
    changed = true
  }
  if (changed) {
    window.history.replaceState(null, '', url.toString())
  }
}

export function initRouter() {
  stripTrackingParams()
  const { route, params } = parseLocation()
  currentRoute = route
  routeParams = params

  function onUrlChange() {
    const { route: r, params: p } = parseLocation()
    currentRoute = r
    routeParams = p
  }

  window.addEventListener('hashchange', onUrlChange)
  window.addEventListener('popstate', onUrlChange)
}

export function navigate(route: Route, params: Record<string, string> = {}) {
  if (route === 'not-found') {
    window.location.hash = 'home'
    return
  }
  let hash: string = route
  if (route === 'admin' && params.section) hash = `admin/${params.section}`
  if (route === 'card' && params.merchantId) hash = `card/${params.merchantId}`

  if (window.location.pathname !== '/') {
    window.history.pushState(null, '', '/#' + hash)
    const { route: r, params: p } = parseLocation()
    currentRoute = r
    routeParams = p
  } else {
    window.location.hash = hash
  }
}

export function getRoute() {
  return currentRoute
}

export function getRouteParams() {
  return routeParams
}
