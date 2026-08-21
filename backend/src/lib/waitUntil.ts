export function waitUntil(c: unknown, promise: Promise<unknown>) {
  try {
    const ctx = (c as any).executionCtx
    if (ctx?.waitUntil) {
      ctx.waitUntil(promise.catch(() => {}))
      return
    }
  } catch {}
  promise.catch(() => {})
}
