import React from 'react';

/** Reusable checkbox with label and ARIA support */
interface FormCheckboxProps {
    id: string;
    label: string | React.ReactNode;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    className?: string;
    description?: string;
}

export function FormCheckbox({ id, label, checked, onChange, disabled, className = '', description }: FormCheckboxProps) {
    return (
        <label
            htmlFor={id}
            className={`flex items-start gap-2.5 text-xs text-content-secondary cursor-pointer ${className}`}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                aria-describedby={description ? `${id}-desc` : undefined}
                className="mt-0.5 shrink-0 rounded border-surface-border bg-surface-base focus-app disabled:opacity-40"
            />
            <span className="min-w-0 break-words leading-snug">
                {label}
                {description && (
                    <span id={`${id}-desc`} className="sr-only">
                        {description}
                    </span>
                )}
            </span>
        </label>
    );
}
