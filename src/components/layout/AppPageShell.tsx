import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Calm page frame: static top accent instead of animated gradient borders (design critique: less decorative motion).
 */
export function AppPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-h-[100dvh] bg-surface-base',
        className,
      )}
    >
      {children}
    </div>
  );
}
