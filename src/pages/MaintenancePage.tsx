import { TransitionLink } from '../components/TransitionLink';
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
      <h1 className="mb-2 text-center text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">
        We&apos;re upgrading Oweable
      </h1>
      <p className="mb-10 max-w-md text-center text-sm font-medium text-content-secondary">
        The app is temporarily unavailable while we ship improvements. Please try again soon, or sign out and
        browse the public site.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-surface-border bg-surface-raised text-sm font-medium text-content-primary hover:bg-surface-elevated transition-colors rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <TransitionLink
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black shadow-none transition-colors hover:bg-neutral-200"
        >
          Home
        </TransitionLink>
      </div>
    </div>
  );
}
