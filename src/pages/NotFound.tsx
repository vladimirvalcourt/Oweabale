import { TransitionLink } from '../components/TransitionLink';

/**
 * Global 404 — matches unknown paths via `<Route path="*" />`.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-6 py-20">
      <p className="section-label mb-5">404</p>
      <h1 className="mb-3 text-center text-3xl font-medium tracking-tight text-content-primary sm:text-4xl">
        Page not found
      </h1>
      <p className="mb-12 max-w-md text-center text-sm font-medium leading-relaxed text-content-secondary">
        That URL does not exist in Oweable. Check the address or return to your dashboard.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <TransitionLink
          to="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-surface-border bg-surface-raised px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-elevated"
        >
          Home
        </TransitionLink>
        <TransitionLink
          to="/dashboard"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover"
        >
          Dashboard
        </TransitionLink>
      </div>
    </div>
  );
}
