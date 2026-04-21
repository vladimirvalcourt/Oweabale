import { X } from 'lucide-react';
import { useImpersonation } from './ImpersonationContext';

export function ImpersonationBanner() {
  const { impersonating, impersonated_email, stopImpersonation } = useImpersonation();

  if (!impersonating) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[9999] flex items-center justify-between gap-3 bg-rose-600 px-4 py-2 text-white shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <span className="text-xs font-semibold tracking-wide">
        ADMIN MODE — Viewing as{' '}
        <strong className="font-bold">{impersonated_email ?? 'unknown user'}</strong>
        {' '}· All writes are blocked
      </span>
      <button
        type="button"
        onClick={stopImpersonation}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
      >
        <X className="h-3 w-3" />
        Exit impersonation
      </button>
    </div>
  );
}
