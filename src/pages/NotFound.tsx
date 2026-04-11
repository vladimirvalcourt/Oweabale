import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * Global 404 — matches unknown paths via `<Route path="*" />`.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-6 py-16">
      <p className="text-xs font-sans font-medium text-content-tertiary mb-4">404</p>
      <h1 className="text-2xl font-semibold text-content-primary tracking-tight mb-2">Page not found</h1>
      <p className="text-sm text-content-tertiary text-center max-w-md mb-10">
        That URL does not exist in Oweable. Check the address or return to your dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-surface-border bg-surface-raised text-sm font-medium text-content-primary hover:bg-surface-elevated transition-colors rounded-sm"
        >
          <Home className="w-4 h-4 shrink-0" aria-hidden />
          Home
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rotate-180 shrink-0" aria-hidden />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
