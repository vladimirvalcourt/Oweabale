import { TransitionLink } from '../components/common';
import { useAuth } from '../hooks';

/**
 * Global 404 — matches unknown paths via `<Route path="*" />`.
 */
export default function NotFound() {
  const { user: authUser } = useAuth();
  const primaryHref = authUser ? '/pro/dashboard' : '/auth';
  const primaryLabel = authUser ? 'Pay List' : 'Sign in';

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-5 py-20 text-content-primary selection:bg-brand-violet/25 sm:px-8">
      <p className="mb-5 text-xs font-medium uppercase tracking-[0.16em] text-content-muted">404</p>
      <h1 className="mb-4 max-w-xl text-center text-5xl font-medium leading-none tracking-[-0.055em] text-content-primary sm:text-6xl">
        That page is not here.
      </h1>
      <p className="mb-12 max-w-md text-center text-sm leading-6 text-content-tertiary">
        The link may be old, broken, or incomplete. You can head back home or jump into your dashboard.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <TransitionLink
          to="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-raised px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-highlight"
        >
          Home
        </TransitionLink>
        <TransitionLink
          to={primaryHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-content-primary px-5 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-content-secondary"
        >
          {primaryLabel}
        </TransitionLink>
      </div>
    </div>
  );
}
