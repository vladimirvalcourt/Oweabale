import React from 'react';
import { Plus, FileText, CreditCard, Calendar, Landmark, Upload } from 'lucide-react';
import { TransitionLink } from './TransitionLink';

export type EmptyStateProps = {
  icon?: React.ElementType;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  hint?: string;
};

const defaultIcons: Record<string, React.ElementType> = {
  transactions: Landmark,
  bills: CreditCard,
  calendar: Calendar,
  documents: FileText,
  upload: Upload,
};

export function GuidedEmptyState({
  icon: IconProp,
  title,
  description,
  primaryAction,
  secondaryAction,
  hint,
}: EmptyStateProps) {
  const Icon = IconProp || FileText;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-base/50 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
        <Icon className="h-6 w-6 text-content-tertiary" />
      </div>
      
      <h3 className="mt-4 text-sm font-semibold text-content-primary">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-content-secondary">{description}</p>

      {primaryAction && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-indigo px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors focus-app"
        >
          {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
          {primaryAction.label}
        </button>
      )}

      {secondaryAction && (
        <TransitionLink
          to={secondaryAction.href}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-content-tertiary underline underline-offset-2 hover:text-content-secondary transition-colors"
        >
          {secondaryAction.label}
        </TransitionLink>
      )}

      {hint && (
        <p className="mt-4 max-w-xs text-[11px] leading-4 text-content-muted italic">
          💡 {hint}
        </p>
      )}
    </div>
  );
}
