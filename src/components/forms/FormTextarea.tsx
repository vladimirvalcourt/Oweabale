import React from 'react';
import { AlertCircle } from 'lucide-react';

/** Reusable textarea with label, character count, and ARIA support */
interface FormTextareaProps {
    id: string;
    label: string | React.ReactNode;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    rows?: number;
    maxLength?: number;
    hint?: string;
}

export function FormTextarea({
    id,
    label,
    value,
    onChange,
    placeholder,
    error,
    required,
    disabled,
    rows = 2,
    maxLength,
    hint,
}: FormTextareaProps) {
    const errorId = `${id}-error`;
    const hintId = hint ? `${id}-hint` : undefined;
    const hasError = !!error;
    const charCount = value.length;
    const showProgress = maxLength !== undefined;
    const progressPercentage = maxLength ? (charCount / maxLength) * 100 : 0;
    const isNearLimit = progressPercentage > 75;

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
                {label}
                {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
            </label>
            <textarea
                id={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                rows={rows}
                maxLength={maxLength}
                aria-invalid={hasError}
                aria-describedby={[hasError ? errorId : undefined, hintId, maxLength ? `${id}-count` : undefined].filter(Boolean).join(' ') || undefined}
                aria-required={required}
                className={`w-full bg-surface-base border ${hasError ? 'border-[var(--color-status-rose-border)]' : 'border-surface-border'} radius-input focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted resize-none transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
            />
            {hint && <p id={hintId} className="text-xs text-content-muted mt-1">{hint}</p>}
            {hasError && (
                <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
                    <AlertCircle className="w-3 h-3" aria-hidden />
                    {error}
                </p>
            )}
            {showProgress && (
                <div className="mt-1.5">
                    <div className="flex items-center justify-between mb-1">
                        <p id={`${id}-count`} className={`text-xs font-mono ${isNearLimit ? 'text-[var(--color-status-amber-text)]' : 'text-content-muted'}`} aria-live="polite">
                            {charCount}/{maxLength} characters
                        </p>
                        {isNearLimit && (
                            <div className="flex-1 ml-2 h-1 bg-surface-raised rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-200 ${progressPercentage > 90 ? 'bg-[var(--color-status-rose-text)]' : 'bg-[var(--color-status-amber-text)]'}`}
                                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                    role="progressbar"
                                    aria-valuenow={charCount}
                                    aria-valuemin={0}
                                    aria-valuemax={maxLength}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
