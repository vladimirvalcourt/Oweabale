import React, { useEffect, useState } from 'react';
import { TransitionLink } from './TransitionLink';
import { getTrialDaysRemaining } from '../lib/trialHelpers';
import { useStore } from '../store/useStore';
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

  // Don't show banner if not loading and no trial
  if (isLoading || daysRemaining === null || daysRemaining <= 0) {
    return null;
  }

  // Determine urgency state
  const isUrgent = daysRemaining <= 4;

  return (
    <div
      className={`w-full py-3 px-4 ${
        isUrgent
          ? 'bg-amber-500/10 border-b border-amber-500/20'
          : 'bg-yellow-500/10 border-b border-yellow-500/20'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isUrgent ? (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600 shrink-0" aria-hidden />
          )}
          
          <p className={`text-sm font-medium truncate ${isUrgent ? 'text-amber-900' : 'text-yellow-900'}`}>
            {isUrgent ? (
              <span>
                <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</strong> on your trial — your debt planner and income tools will lock. Keep them for $10/mo
              </span>
            ) : (
              <span>
                Full Suite trial — <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</strong>. Upgrade to keep access
              </span>
            )}
          </p>
        </div>

        <TransitionLink
          to="/pricing"
          className={`shrink-0 text-sm font-semibold underline underline-offset-2 hover:no-underline ${
            isUrgent
              ? 'text-amber-700 hover:text-amber-900'
              : 'text-yellow-700 hover:text-yellow-900'
          }`}
        >
          {isUrgent ? 'Upgrade now →' : 'View plans →'}
        </TransitionLink>
      </div>
    </div>
  );
}
