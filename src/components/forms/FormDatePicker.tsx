import React from 'react';

/** Enhanced date picker with calendar widget support */
interface FormDatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  hint?: string;
  showDaysLeft?: boolean;
}

export function FormDatePicker({
  id,
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  min,
  max,
  hint,
  showDaysLeft = false,
}: FormDatePickerProps) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const hasError = !!error;

  const calculateDaysLeft = () => {
    if (!value) return null;
    const targetDate = new Date(value);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = showDaysLeft ? calculateDaysLeft() : null;

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
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={hasError}
        aria-describedby={[hintId, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined}
        aria-required={required}
        className={`input-date-dark w-full bg-surface-base border ${hasError ? 'border-[var(--color-status-rose-border)]' : 'border-surface-border'} radius-input focus-app-field px-3 py-2 text-sm font-sans transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
      />
      {daysLeft !== null && (
        <p className={`mt-1 text-xs font-mono ${daysLeft < 0 ? 'text-[var(--color-status-rose-text)]' : daysLeft <= 7 ? 'text-[var(--color-status-amber-text)]' : 'text-content-muted'}`} aria-live="polite">
          {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft} days remaining`}
        </p>
      )}
      {hint && !showDaysLeft && <p id={hintId} className="text-xs text-content-muted mt-1">{hint}</p>}
      {hasError && (
        <p id={errorId} className="mt-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
