import { Link } from 'react-router-dom';
import { Construction, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';

/**
 * Shown when `platform_settings.maintenance_mode` is on for signed-in non-admin users.
 */
export default function MaintenancePage() {
  const signOut = useStore((s) => s.signOut);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-6 py-16">
      <Construction className="w-12 h-12 text-amber-500/90 mb-6" aria-hidden />
      <p className="text-xs font-sans font-medium text-content-tertiary mb-4">Maintenance</p>
      <h1 className="text-2xl font-semibold text-content-primary tracking-tight mb-2 text-center">
        We&apos;re upgrading Oweable
      </h1>
      <p className="text-sm text-content-tertiary text-center max-w-md mb-10">
        The app is temporarily unavailable while we ship improvements. Please try again soon, or sign out and
        browse the public site.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-surface-border bg-surface-raised text-sm font-medium text-content-primary hover:bg-surface-elevated transition-colors rounded-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold shadow-sm transition-colors rounded-sm"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
