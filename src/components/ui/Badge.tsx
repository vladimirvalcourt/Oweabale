import * as React from 'react';
import { cn } from '../../lib/utils';

const badgeBase =
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

const badgeVariantClasses = {
  default:
    'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
  secondary:
    'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive:
    'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
  outline: 'text-foreground',
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
