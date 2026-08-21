export type ThemePreference = 'light' | 'dark' | 'system'

let preference = $state<ThemePreference>('system')
let mediaQuery: MediaQueryList | null = null

function resolveDark(): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme() {
  const dark = resolveDark()
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', dark ? '#131b2e' : '#006948')
}

function onSystemChange() {
  if (preference === 'system') applyTheme()
}

export function initTheme() {
  const saved = localStorage.getItem('theme') as ThemePreference | null
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    preference = saved
  }
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', onSystemChange)
  applyTheme()
}

export function setTheme(t: ThemePreference) {
  preference = t
  localStorage.setItem('theme', t)
  applyTheme()
}

export function getThemePreference(): ThemePreference {
  return preference
}

export function isDarkMode(): boolean {
  return resolveDark()
}
