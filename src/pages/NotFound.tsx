import { TransitionLink } from '../components/TransitionLink';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * Global 404 — matches unknown paths via `<Route path="*" />`.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-6 py-20">
      <p className="section-label mb-5">404</p>
      <h1 className="text-3xl sm:text-4xl font-semibold text-content-primary tracking-tight text-center mb-3">
        Page not found
      </h1>
      <p className="text-sm text-content-secondary text-center max-w-md leading-relaxed mb-12">
        That URL does not exist in Oweable. Check the address or return to your dashboard.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <TransitionLink
          to="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-elevated"
        >
          <Home className="w-4 h-4 shrink-0" aria-hidden />
          Home
        </TransitionLink>
        <TransitionLink
          to="/dashboard"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-sans font-semibold text-black shadow-none transition-colors hover:bg-neutral-200"
        >
          <ArrowLeft className="w-4 h-4 rotate-180 shrink-0" aria-hidden />
          Dashboard
        </TransitionLink>
      </div>
    </div>
  );
}
