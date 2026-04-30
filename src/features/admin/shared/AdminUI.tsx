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
    <header className="ui-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="ui-label">{eyebrow}</p>
          <h1 className="mt-2 text-xl font-semibold leading-tight text-content-primary sm:text-2xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary text-pretty">{description}</p>
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
    <section className={cn('ui-card overflow-hidden bg-surface-raised/55', className)}>
      {(title || description || actions) ? (
        <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-sm font-semibold text-content-primary">{title}</h2> : null}
            {description ? <p className="mt-1 max-w-2xl text-xs leading-5 text-content-tertiary text-pretty">{description}</p> : null}
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
    good: 'border-[var(--color-status-emerald-border)] text-[var(--color-status-emerald-text)]',
    warn: 'border-[var(--color-status-amber-border)] text-[var(--color-status-amber-text)]',
    danger: 'border-[var(--color-status-rose-border)] text-[var(--color-status-rose-text)]',
  }[tone];

  return (
    <div className={cn('ui-card-compact px-3 py-2.5', toneClass)}>
      <p className="ui-label text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs leading-4 text-content-tertiary">{sub}</p> : null}
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
    good: 'border-[var(--color-status-emerald-border)] bg-[var(--color-status-emerald-bg)] text-[var(--color-status-emerald-text)]',
    warn: 'border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)]',
    danger: 'border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)]',
    info: 'border-[var(--color-status-info-border)] bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)]',
  }[tone];

  return (
    <span className={cn('ui-pill ui-pill-sm uppercase tracking-[0.08em]', toneClass)}>
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
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-surface-border bg-surface-base text-content-tertiary">
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
  'ui-field text-xs';

export const adminButtonClass =
  'ui-button ui-button-sm ui-button-secondary text-content-secondary hover:text-content-primary disabled:opacity-40';

export const adminDangerButtonClass =
  'ui-button ui-button-sm border border-rose-500/50 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 disabled:opacity-40 dark:text-rose-100';
