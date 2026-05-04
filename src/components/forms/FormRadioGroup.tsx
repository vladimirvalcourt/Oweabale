import React from 'react';

/** Radio option for FormRadioGroup */
interface RadioOption {
    value: string;
    label: string;
}

/** Reusable radio group with ARIA support */
interface FormRadioGroupProps {
    id: string;
    name: string;
    label: string | React.ReactNode;
    value: string;
    onChange: (value: string) => void;
    options: RadioOption[];
    required?: boolean;
    disabled?: boolean;
    hint?: string;
}

export function FormRadioGroup({ id, name: _name, label, value, onChange, options, required, disabled, hint }: FormRadioGroupProps) {
    const groupId = `${id}-group`;
    const hintId = hint ? `${id}-hint` : undefined;

    return (
        <fieldset id={groupId} className="rounded-lg border border-surface-border bg-surface-base p-3" role="radiogroup" aria-required={required}>
            <legend className="text-xs font-sans font-medium text-content-tertiary mb-2">
                {label}
                {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
            </legend>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center">
                <div className="flex rounded-lg border border-surface-border p-0.5 bg-surface-raised gap-0.5 w-full sm:w-auto">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={value === option.value}
                            tabIndex={value === option.value ? 0 : -1}
                            onClick={() => !disabled && onChange(option.value)}
                            disabled={disabled}
                            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-sans font-medium transition-colors focus-app text-center ${value === option.value
                                ? 'bg-brand-cta text-surface-base'
                                : 'text-content-tertiary hover:text-content-primary'
                                } disabled:opacity-40`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            {hint && <p id={hintId} className="text-xs text-content-muted mt-2 leading-snug">{hint}</p>}
        </fieldset>
    );
}
