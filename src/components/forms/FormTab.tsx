import React from 'react';

/** Reusable tab button with ARIA support */
interface FormTabProps {
    id: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'citation';
}

export function FormTab({ id, label, isActive, onClick, icon, variant = 'default' }: FormTabProps) {
    return (
        <button
            type="button"
            role="tab"
            id={id}
            aria-selected={isActive}
            aria-controls="quick-add-form"
            tabIndex={isActive ? 0 : -1}
            onClick={onClick}
            className={`min-h-10 min-w-0 px-3 py-2 text-xs font-sans font-medium transition-all rounded-lg focus-app ${variant === 'citation'
                ? isActive
                    ? 'bg-content-primary/[0.08] text-content-primary border border-surface-border'
                    : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                : isActive
                    ? 'bg-brand-cta text-surface-base'
                    : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                }`}
        >
            {icon && <span className="inline-flex min-w-0 items-center justify-center gap-1.5">{icon}<span className="truncate">{label}</span></span>}
            {!icon && <span className="truncate">{label}</span>}
        </button>
    );
}
