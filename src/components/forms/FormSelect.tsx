import React from 'react';

/** Reusable select field with label and ARIA support */
interface FormSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormSelect({
  id,
  label,
  value,
  onChange,
  children,
  required,
  disabled,
  className = '',
}: FormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-required={required}
        className={`w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer transition-colors hover:border-content-primary/15 disabled:opacity-40 ${className}`}
      >
        {children}
      </select>
    </div>
  );
}
