import * as React from 'react';
import { cn } from '../../lib/utils';

const badgeBase =
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-brand-indigo focus:ring-offset-2 focus:ring-offset-surface-base';

const badgeVariantClasses = {
  default:
    'border-surface-border bg-surface-base text-content-secondary hover:bg-surface-elevated',
  secondary:
    'border-surface-border bg-surface-raised text-content-secondary hover:bg-surface-elevated',
  destructive:
    'border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)] hover:bg-[var(--color-status-rose-bg)]',
  outline: 'border-surface-border text-content-secondary',
  success:
    'border-transparent bg-[var(--color-status-emerald-bg)] text-[var(--color-status-emerald-text)] hover:bg-[var(--color-status-emerald-bg)]',
  warning:
    'border-transparent bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)] hover:bg-[var(--color-status-amber-bg)]',
  error:
    'border-transparent bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)] hover:bg-[var(--color-status-rose-bg)]',
} as const;

type BadgeVariant = keyof typeof badgeVariantClasses;

function badgeVariants({ variant = 'default' }: { variant?: BadgeVariant }) {
  return cn(badgeBase, badgeVariantClasses[variant]);
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
