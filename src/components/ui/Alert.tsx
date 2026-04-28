import * as React from 'react';
import { cn } from '../../lib/utils';

const alertBase =
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7';

const alertVariantClasses = {
  default: 'bg-surface-raised text-content-primary border-surface-border',
  destructive:
    'border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)] [&>svg]:text-[var(--color-status-rose-text)]',
  success:
    'border-[var(--color-status-emerald-border)] bg-[var(--color-status-emerald-bg)] text-[var(--color-status-emerald-text)] [&>svg]:text-[var(--color-status-emerald-text)]',
  warning:
    'border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)] [&>svg]:text-[var(--color-status-amber-text)]',
  info:
    'border-brand-indigo/50 bg-brand-indigo/10 text-content-primary [&>svg]:text-brand-indigo',
} as const;

type AlertVariant = keyof typeof alertVariantClasses;

function alertVariants({ variant = 'default' }: { variant?: AlertVariant }) {
  return cn(alertBase, alertVariantClasses[variant]);
}

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90 [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
