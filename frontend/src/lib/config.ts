import { version } from '../../package.json'

export const VERSION = version

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''
