interface WorkerEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  BACKEND_URL: string
}

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/health')
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url)

    if (isApiPath(url.pathname) && env.BACKEND_URL) {
      const backend = new URL(env.BACKEND_URL)
      const target = new URL(request.url)
      target.protocol = backend.protocol
      target.host = backend.host
      target.port = backend.port
      target.username = ''
      target.password = ''

      return fetch(target.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
      })
    }

    return env.ASSETS.fetch(request)
  },
}
