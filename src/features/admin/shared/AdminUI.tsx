import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../../lib/utils';

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  metrics?: Array<{ label: string; value: ReactNode; tone?: 'default' | 'good' | 'warn' | 'danger' }>;
};

export function AdminPageHeader({ eyebrow = 'Oweable admin', title, description, actions, metrics }: AdminPageHeaderProps) {
  return (
    <header className="border border-surface-border bg-surface-raised/70 p-4 shadow-sm shadow-black/5 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">{eyebrow}</p>
          <h1 className="mt-2 text-xl font-semibold tracking-normal text-content-primary sm:text-2xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {metrics?.length ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <AdminMetric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border border-surface-border bg-surface-raised/55 shadow-sm shadow-black/5', className)}>
      {(title || description || actions) ? (
        <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-sm font-semibold text-content-primary">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs leading-5 text-content-tertiary">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminMetric({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'danger';
}) {
  const toneClass = {
    default: 'border-surface-border text-content-primary',
    good: 'border-emerald-500/35 text-emerald-700 dark:text-emerald-200',
    warn: 'border-amber-500/40 text-amber-700 dark:text-amber-200',
    danger: 'border-rose-500/40 text-rose-700 dark:text-rose-200',
  }[tone];

  return (
    <div className={cn('border bg-surface-base/70 px-3 py-2', toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] leading-4 text-content-muted">{sub}</p> : null}
    </div>
  );
}

export function AdminStatusBadge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'danger' | 'info';
}) {
  const toneClass = {
    default: 'border-surface-border bg-surface-base text-content-secondary',
    good: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    warn: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    danger: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200',
    info: 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  }[tone];

  return (
    <span className={cn('inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', toneClass)}>
      {children}
    </span>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center border border-surface-border bg-surface-base text-content-tertiary">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-content-primary">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-content-tertiary">{description}</p>
      </div>
    </div>
  );
}

export const adminInputClass =
  'focus-app-field border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary placeholder:text-content-muted';

export const adminButtonClass =
  'interactive-press interactive-focus inline-flex items-center justify-center gap-1.5 border border-surface-border bg-surface-base px-3 py-2 text-xs font-medium text-content-secondary transition-colors hover:border-content-primary hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-40';

export const adminDangerButtonClass =
  'danger-button interactive-focus inline-flex items-center justify-center gap-1.5 border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-100';
