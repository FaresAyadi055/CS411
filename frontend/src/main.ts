import { mount } from 'svelte'
import App from './App.svelte'
import { initTheme } from './stores/theme.svelte'

if (import.meta.env.VITE_DEMO === 'true') {
  import('./lib/demo-api').then(({ installDemoFetch }) => installDemoFetch())
}

initTheme()

const app = mount(App, { target: document.getElementById('app')! })

export default app

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
