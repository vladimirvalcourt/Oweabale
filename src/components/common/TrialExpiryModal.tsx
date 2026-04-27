import React, { useEffect, useState } from 'react';
import { TransitionLink } from './TransitionLink';
import { getUserProfile } from '../../app/constants';
import { useStore } from '../../store';
import { X } from 'lucide-react';

interface TrialExpiryModalProps {
  onDismiss: () => void;
}

export default function TrialExpiryModal({ onDismiss }: TrialExpiryModalProps) {
  const user = useStore((state) => state.user);
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
        
        // Check if user is on tracker plan with expired trial
        const shouldShow = profile?.plan === 'tracker' && profile?.trial_expired;
        
        // Check localStorage to see if modal was already dismissed
        const modalDismissed = localStorage.getItem(`trial-expiry-modal-seen-${user.id}`);
        
        if (shouldShow && !modalDismissed) {
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

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`trial-expiry-modal-seen-${user.id}`, 'true');
    }
    onDismiss();
  };

  if (isLoading || !hasSeenModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-surface-base border border-surface-border rounded-xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-content-tertiary hover:text-content-primary transition-colors rounded-lg hover:bg-content-primary/5"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-content-primary text-center mb-4">
          Your Full Suite trial has ended
        </h2>

        {/* Body */}
        <p className="text-content-secondary text-center leading-relaxed mb-8">
          Your Pay List is still available. Upgrade to restore the advanced debt payoff planner, income ledger, budgets, and tax tools.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <TransitionLink
            to="/pricing"
            onClick={handleDismiss}
            className="w-full py-3 px-6 bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-semibold text-center rounded-lg transition-colors"
          >
            Upgrade to Full Suite — $10/mo
          </TransitionLink>

          <button
            onClick={handleDismiss}
            className="w-full py-3 px-6 bg-transparent border border-surface-border text-content-secondary hover:text-content-primary hover:bg-content-primary/5 text-sm font-medium text-center rounded-lg transition-colors"
          >
            Continue to Pay List
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-content-tertiary text-center">
          You still have access to bill tracking, due-date alerts, and account settings.
        </p>
      </div>
    </div>
  );
}
