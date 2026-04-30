import React from 'react';

/** Reusable date input with label and ARIA support */
interface FormDateProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function FormDate({
  id,
  label,
  value,
  onChange,
  error,
  required,
  disabled,
}: FormDateProps) {
  const errorId = `${id}-error`;
  const hasError = !!error;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        aria-required={required}
        className={`input-date-dark w-full bg-surface-base border ${hasError ? 'border-[var(--color-status-rose-border)]' : 'border-surface-border'} radius-input focus-app-field px-3 py-2 text-sm font-sans transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
      />
      {hasError && (
        <p id={errorId} className="mt-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
