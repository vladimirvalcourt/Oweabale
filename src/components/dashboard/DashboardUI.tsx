import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Dashboard Panel Components
// ============================================================================

/**
 * DashboardPanel - Main container panel for dashboard sections
 * Uses 22px border-radius (panel spec) with surface-raised background
 */
export function DashboardPanel({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <div className={cn('app-panel', className)}>{children}</div>;
}

/**
 * DashboardSection - Panel with header and content area
 * Includes optional title, description, and actions
 */
export function DashboardSection({
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
        <DashboardPanel className={className}>
            {(title || description || actions) ? (
                <div className="flex flex-col gap-3 border-b border-surface-border px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        {title ? <h2 className="text-lg font-semibold text-content-primary">{title}</h2> : null}
                        {description ? (
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-content-secondary text-pretty">{description}</p>
                        ) : null}
                    </div>
                    {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
                </div>
            ) : null}
            <div className="p-6">{children}</div>
        </DashboardPanel>
    );
}

// ============================================================================
// Status Badge System
// ============================================================================

type StatusTone = 'default' | 'urgent' | 'warning' | 'info';

/**
 * StatusBadge - Semantic status indicator with consistent styling
 * Maps to DESIGN.md status color system
 */
export function StatusBadge({
    children,
    tone = 'default',
    className,
}: {
    children: ReactNode;
    tone?: StatusTone;
    className?: string;
}) {
    const toneClass = {
        default: 'bg-content-primary/[0.06] text-content-secondary',
        urgent: 'bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)] dark:text-[var(--color-status-rose-text-dark,--color-status-rose-text)]',
        warning: 'bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)] dark:text-[var(--color-status-amber-text-dark,--color-status-amber-text)]',
        info: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)] dark:text-[var(--color-status-info-text-dark,--color-status-info-text)]',
    }[tone];

    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', toneClass, className)}>
            {children}
        </span>
    );
}

/**
 * StatusIcon - Icon container with semantic status coloring
 * Used for visual indicators in lists and cards
 */
export function StatusIcon({
    icon: Icon,
    tone = 'default',
    className,
    iconProps = {},
}: {
    icon: React.ElementType;
    tone?: StatusTone;
    className?: string;
    iconProps?: Record<string, any>;
}) {
    const toneClass = {
        default: 'border-surface-border bg-surface-base text-content-secondary',
        urgent: 'border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)]',
        warning: 'border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)]',
        info: 'border-[var(--color-status-info-border)] bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)]',
    }[tone];

    return (
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md border', toneClass, className)}>
            <Icon className="h-4 w-4" aria-hidden {...iconProps} />
        </div>
    );
}

// ============================================================================
// Metric Card Components
// ============================================================================

/**
 * MetricCard - Displays key metrics with label and value
 * Used in dashboard metric grids
 */
export function MetricCard({
    icon: Icon,
    label,
    value,
    sublabel,
    href,
    onClick,
    className,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: ReactNode;
    sublabel?: string;
    href?: string;
    onClick?: () => void;
    className?: string;
}) {
    const Inner = (
        <div className={cn('app-panel h-full p-4 transition-colors hover:bg-surface-elevated', className)}>
            <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-content-tertiary">
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-content-primary">{value}</p>
            {sublabel ? <p className="mt-1 text-xs text-content-secondary">{sublabel}</p> : null}
        </div>
    );

    if (href) {
        return (
            <a href={href} className="rounded-[22px] focus-app">
                {Inner}
            </a>
        );
    }

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="w-full rounded-[22px] focus-app">
                {Inner}
            </button>
        );
    }

    return <div className="rounded-[22px]">{Inner}</div>;
}

/**
 * QuickActionCard - Actionable card for quick add operations
 * Combines icon, label, and description in clickable format
 */
export function QuickActionCard({
    icon: Icon,
    label,
    description,
    href,
    onClick,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    description: string;
    href?: string;
    onClick?: () => void;
}) {
    const inner = (
        <div className="app-panel flex h-full min-h-[5.5rem] items-start gap-3 p-4 text-left transition-colors hover:bg-surface-elevated">
            <StatusIcon icon={Icon} tone="default" />
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-content-primary">{label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-content-tertiary">{description}</span>
            </span>
        </div>
    );

    if (href) {
        return (
            <a href={href} className="block rounded-[22px] focus-app">
                {inner}
            </a>
        );
    }

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="w-full rounded-[22px] focus-app">
                {inner}
            </button>
        );
    }

    return <div className="rounded-[22px]">{inner}</div>;
}

// ============================================================================
// Empty State Components
// ============================================================================

/**
 * DashboardEmptyState - Standardized empty state for dashboard sections
 */
export function DashboardEmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('premium-empty-state', className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-surface-border bg-surface-base">
                <Icon className="h-6 w-6 text-content-tertiary" aria-hidden />
            </div>
            <div className="text-center">
                <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
                <p className="mt-1 text-sm text-content-secondary">{description}</p>
            </div>
            {action}
        </div>
    );
}

// ============================================================================
// Button Variants
// ============================================================================

/**
 * DashboardButton - Primary action button for dashboard
 */
export function DashboardButton({
    children,
    onClick,
    variant = 'primary',
    className,
}: {
    children: ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
    className?: string;
}) {
    const baseClass =
        'inline-flex min-h-12 items-center justify-center rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-app';

    const variantClass = {
        primary: 'bg-content-primary text-surface-base hover:bg-content-secondary',
        secondary: 'border border-surface-border text-content-secondary hover:bg-content-primary/[0.04] hover:text-content-primary',
    }[variant];

    return (
        <button type="button" onClick={onClick} className={cn(baseClass, variantClass, className)}>
            {children}
        </button>
    );
}
