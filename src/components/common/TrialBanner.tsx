import React, { useEffect, useState } from 'react';
import { TransitionLink } from './TransitionLink';
import { getTrialDaysRemaining } from '../../app/constants';
import { useStore } from '../../store';
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

    async function fetchTrialStatus() {
      try {
        const days = await getTrialDaysRemaining(user.id);
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
          ? 'bg-rose-500/10 border-b border-rose-500/20'
          : 'bg-amber-500/10 border-b border-amber-500/20'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isUrgent ? (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" aria-hidden />
          ) : (
            <Clock className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
          )}

          <p className={`text-sm font-medium truncate ${isUrgent ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
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
              ? 'text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300'
              : 'text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300'
          }`}
        >
          {isUrgent ? 'Upgrade now →' : 'View plans →'}
        </TransitionLink>
      </div>
    </div>
  );
}
