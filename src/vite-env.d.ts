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
  /** Sentry browser DSN; omit to disable the SDK. */
  readonly VITE_SENTRY_DSN?: string;
  /** Optional release identifier (e.g. git SHA from CI). */
  readonly VITE_SENTRY_RELEASE?: string;
  /** Optional app version label for Sentry release (build-time). */
  readonly VITE_APP_VERSION?: string;
  /** Optional override for Sentry environment (otherwise `VERCEL_ENV` or Vite `MODE`). */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** Build-time: resolved release (VITE_SENTRY_RELEASE / SENTRY_RELEASE / VITE_APP_VERSION / oweable@VERCEL_GIT_COMMIT_SHA). */
  readonly VITE_SENTRY_RELEASE_RESOLVED: string;
  /** Build-time: resolved environment for Sentry (VITE_SENTRY_ENVIRONMENT / VERCEL_ENV / MODE). */
  readonly VITE_SENTRY_ENVIRONMENT_RESOLVED: string;
  /** Marketing: monthly price label on /pricing (must match Stripe monthly Price). */
  readonly VITE_PRICING_MONTHLY_DISPLAY?: string;
  /** Marketing: annual total for Full Suite; when set, enables yearly plan toggle on /pricing. */
  readonly VITE_PRICING_YEARLY_DISPLAY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
