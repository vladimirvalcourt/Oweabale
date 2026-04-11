/// <reference types="vite/client" />

// Allow ?url imports (e.g. pdfjs worker)
declare module '*?url' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** When `"true"`, show Plaid bank linking in Settings → Integrations. */
  readonly VITE_PLAID_LINK_UI_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
