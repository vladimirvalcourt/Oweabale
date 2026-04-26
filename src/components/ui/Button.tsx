import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]';

const buttonVariantClasses = {
  default:
    'bg-brand-cta text-surface-base shadow hover:bg-brand-cta-hover hover:shadow-lg hover:shadow-white/10',
  destructive:
    'bg-brand-expense text-destructive-foreground shadow-sm hover:bg-brand-expense/90',
  outline:
    'border border-surface-border bg-surface-base text-content-primary hover:bg-surface-highlight hover:border-content-primary/25',
  secondary:
    'bg-surface-highlight text-content-secondary hover:bg-surface-elevated',
  ghost: 'hover:bg-content-primary/[0.04] hover:text-content-primary',
  link: 'text-content-primary underline-offset-4 hover:underline',
  success: 'bg-brand-profit text-surface-base shadow hover:bg-brand-profit/90',
} as const;

const buttonSizeClasses = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-8',
  icon: 'h-9 w-9',
} as const;

type ButtonVariant = keyof typeof buttonVariantClasses;
type ButtonSize = keyof typeof buttonSizeClasses;

function buttonVariants({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(buttonBase, buttonVariantClasses[variant], buttonSizeClasses[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
