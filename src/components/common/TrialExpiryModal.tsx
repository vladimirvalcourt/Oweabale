import React, { useEffect, useState } from 'react';
import { getUserProfile } from '../../app/constants';
import { useStore } from '../../store';
import { Lock } from 'lucide-react';
import { ThemeBackdrop } from './ThemeBackdrop';

interface TrialExpiryModalProps {
  onDismiss: () => void;
}

export default function TrialExpiryModal({ onDismiss }: TrialExpiryModalProps) {
  const user = useStore((state) => state.user);
  const signOut = useStore((state) => state.signOut);
  const [hasSeenModal, setHasSeenModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    async function checkModalStatus() {
      try {
        const profile = await getUserProfile(user.id);
        
        // The hard route guard handles enforcement; this fallback is only for stale mounted sessions.
        const shouldShow = profile?.plan === 'tracker' && profile?.trial_expired;
        if (shouldShow) {
          setHasSeenModal(true);
        }
      } catch (error) {
        console.error('Failed to check trial status:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkModalStatus();
  }, [user?.id]);

  if (isLoading || !hasSeenModal) {
    return null;
  }

  return (
    <>
      <ThemeBackdrop />
      <div className="relative z-[100] w-full max-w-lg bg-surface-base border border-surface-border rounded-xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-status-amber-bg)] flex items-center justify-center">
          <Lock className="h-7 w-7 text-[var(--color-status-amber-text)]" aria-hidden />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-content-primary text-center mb-4">
          Your Full Suite trial has ended
        </h2>

        {/* Body */}
        <p className="text-content-secondary text-center leading-relaxed mb-8">
          Your 14-day trial ended. Subscribe to continue using Oweable.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <a
            href="/pro/settings?tab=billing&locked=trial"
            className="w-full py-3 px-6 bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-semibold text-center rounded-lg transition-colors"
          >
            Go to billing
          </a>

          <button
            onClick={() => {
              void signOut().finally(onDismiss);
            }}
            className="w-full py-3 px-6 bg-transparent border border-surface-border text-content-secondary hover:text-content-primary hover:bg-content-primary/5 text-sm font-medium text-center rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-content-tertiary text-center">
          Your data is retained; billing restores access immediately after Stripe confirms payment.
        </p>
      </div>
    </>
  );
}
