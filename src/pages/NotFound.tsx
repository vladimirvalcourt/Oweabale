import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * Global 404 — matches unknown paths via `<Route path="*" />`.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-6 py-16">
      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500 mb-4">404</p>
      <h1 className="text-2xl font-semibold text-content-primary tracking-tight mb-2">Page not found</h1>
      <p className="text-sm text-zinc-500 text-center max-w-md mb-10">
        That URL does not exist in Oweable. Check the address or return to your dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-surface-border bg-surface-raised text-sm font-medium text-content-primary hover:bg-surface-elevated transition-colors rounded-sm"
        >
          <Home className="w-4 h-4" />
          Home
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors rounded-sm"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
