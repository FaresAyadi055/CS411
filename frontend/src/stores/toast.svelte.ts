export type ToastType = 'success' | 'error' | 'info' | 'warning'

let toasts = $state<{ id: number; type: ToastType; message: string }[]>([])
let nextId = 0

export function showToast(type: ToastType, message: string, duration = 3000) {
  const id = nextId++
  toasts.push({ id, type, message })
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
  }, duration)
}

export function getToasts() {
  return toasts
}
