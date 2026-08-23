import { mount } from 'svelte'
import App from './App.svelte'
import { initTheme } from './stores/theme.svelte'

initTheme()

const app = mount(App, { target: document.getElementById('app')! })

export default app

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
