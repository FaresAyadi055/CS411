import { applyCfBindings, type CloudflareBindings } from './config/env'
import { createApp } from './app'

let app: ReturnType<typeof createApp> | null = null

type ExecutionContext = any

export default {
  async fetch(req: Request, bindings: CloudflareBindings, ctx: ExecutionContext) {
    applyCfBindings(bindings)
    if (!app) {
      app = createApp()
    }
    return app.fetch(req, bindings, ctx)
  },
}
