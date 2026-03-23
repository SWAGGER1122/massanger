/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STREAM_API_KEY: string
  readonly VITE_STREAM_TOKEN_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
