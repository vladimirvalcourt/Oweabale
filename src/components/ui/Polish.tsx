import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export function ProductPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('premium-page-header', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="premium-eyebrow">{eyebrow}</p> : null}
        <h1 className="premium-heading mt-2">{title}</h1>
        {description ? <p className="premium-lede mt-3 max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PremiumPanel({
  children,
  className,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className={cn('premium-panel', className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-3 border-b border-surface-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold tracking-[-0.01em] text-content-primary">{title}</h2> : null}
            {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-content-tertiary">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconType;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('premium-empty-state', className)}>
      {Icon ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-surface-border bg-surface-base text-content-tertiary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <div>
        <p className="text-base font-semibold tracking-[-0.01em] text-content-primary">{title}</p>
        {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-content-secondary">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export const premiumInputClass =
  'focus-app-field rounded-md border border-surface-border bg-surface-base px-3 py-2.5 text-sm text-content-primary placeholder:text-content-muted transition-colors hover:border-content-primary/20';

export const premiumPrimaryButtonClass =
  'interactive-press focus-app inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-content-primary px-5 py-2.5 text-sm font-semibold text-surface-base transition-colors hover:bg-content-secondary disabled:cursor-not-allowed disabled:opacity-60';

export const premiumSecondaryButtonClass =
  'interactive-press focus-app inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-raised px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-content-primary/25 hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60';

export const premiumDangerButtonClass =
  'danger-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--color-status-rose-text)] disabled:cursor-not-allowed disabled:opacity-60';
