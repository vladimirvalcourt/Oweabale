import { ThemeToggle, TransitionLink } from '@/components/common';
import { useAuth } from '@/hooks';

/**
 * Global 404 — matches unknown paths via `<Route path="*" />`.
 */
export default function NotFound() {
  const { user: authUser } = useAuth();
  const primaryHref = authUser ? '/pro/dashboard' : '/auth';
  const primaryLabel = authUser ? 'Pay List' : 'Sign in';

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-5 py-20 text-content-primary selection:bg-brand-violet/25 sm:px-8">
      <ThemeToggle className="fixed right-5 top-5 bg-surface-raised/80 backdrop-blur-xl" />
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
          className="ui-button ui-button-md ui-button-secondary"
        >
          Home
        </TransitionLink>
        <TransitionLink
          to={primaryHref}
          className="ui-button ui-button-md ui-button-primary"
        >
          {primaryLabel}
        </TransitionLink>
      </div>
    </div>
  );
}
