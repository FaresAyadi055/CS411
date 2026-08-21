/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAINTENANCE: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.md' {
  const content: string
  export default content
}

declare module '*.md?raw' {
  const content: string
  export default content
}
