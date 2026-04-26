import * as React from 'react';
import { cn } from '../../lib/utils';

const alertBase =
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7';

const alertVariantClasses = {
  default: 'bg-surface-raised text-content-primary border-surface-border',
  destructive:
    'border-brand-expense/50 bg-brand-expense/10 text-brand-expense [&>svg]:text-brand-expense',
  success:
    'border-brand-profit/50 bg-brand-profit/10 text-brand-profit [&>svg]:text-brand-profit',
  warning:
    'border-amber-500/50 bg-amber-500/10 text-amber-400 [&>svg]:text-amber-400',
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
