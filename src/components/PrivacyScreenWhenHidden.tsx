import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Global inactivity guard:
 * if no user interaction occurs for N minutes, sign out automatically.
 */
export function PrivacyScreenWhenHidden() {
  const signOut = useStore((s) => s.signOut);
  const userId = useStore((s) => s.user.id);
  const timerRef = useRef<number | null>(null);
  const signingOutRef = useRef(false);
  useEffect(() => {
    if (!userId) return;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      timerRef.current = window.setTimeout(async () => {
        if (signingOutRef.current) return;
        signingOutRef.current = true;
        toast.info('Signed out due to inactivity.');
        await signOut();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const onActivity = () => {
      startTimer();
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
      'visibilitychange' as keyof WindowEventMap,
    ];

    for (const evt of events) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    startTimer();

    return () => {
      clearTimer();
      for (const evt of events) {
        window.removeEventListener(evt, onActivity);
      }
    };
  }, [signOut, userId]);

  return null;
}
