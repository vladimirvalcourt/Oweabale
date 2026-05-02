import React, { useEffect, useState } from 'react';
import { TransitionLink } from './TransitionLink';
import { getTrialDaysRemaining } from '@/app/constants';
import { useStore } from '@/store';
import { AlertCircle, Clock } from 'lucide-react';

export default function TrialBanner() {
  const user = useStore((state) => state.user);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const userId = user.id; // Capture userId to avoid scope issues in minified code

    async function fetchTrialStatus() {
      try {
        const days = await getTrialDaysRemaining(userId);
        if (mounted) {
          setDaysRemaining(days);
        }
      } catch (error) {
        console.error('Failed to fetch trial status:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTrialStatus();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Show banner only in the final 7 days of the trial
  if (isLoading || daysRemaining === null || daysRemaining <= 0 || daysRemaining > 7) {
    return null;
  }

  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className={`w-full py-3 px-4 ${
        isUrgent
          ? 'border-b border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)]'
          : 'border-b border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isUrgent ? (
            <AlertCircle className="w-5 h-5 text-[var(--color-status-rose-text)] shrink-0" aria-hidden />
          ) : (
            <Clock className="w-5 h-5 text-[var(--color-status-amber-text)] shrink-0" aria-hidden />
          )}

          <p className={`text-sm font-medium truncate ${isUrgent ? 'text-[var(--color-status-rose-text)]' : 'text-[var(--color-status-amber-text)]'}`}>
            {isUrgent ? (
              <span>
                <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</strong> — your debt planner and income tools will lock. Keep them for $10/mo
              </span>
            ) : (
              <span>
                Full Suite trial — <strong>{daysRemaining} days left</strong>. Upgrade anytime to keep everything
              </span>
            )}
          </p>
        </div>

        <TransitionLink
          to="/pricing"
          className={`shrink-0 text-sm font-semibold underline underline-offset-2 hover:no-underline ${
            isUrgent
              ? 'text-[var(--color-status-rose-text)] hover:text-brand-expense'
              : 'text-[var(--color-status-amber-text)] hover:text-content-primary'
          }`}
        >
          {isUrgent ? 'Upgrade now →' : 'View plans →'}
        </TransitionLink>
      </div>
    </div>
  );
}
