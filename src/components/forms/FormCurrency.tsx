import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormCurrencyProps {
  id: string;
  label: string | React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export function FormCurrency({
  id,
  label,
  value,
  onChange,
  placeholder = '0.00',
  error,
  required,
  disabled,
  min = 0,
  max,
  step = 0.01,
  hint,
}: FormCurrencyProps) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const hasError = !!error;

  const formatCurrency = (val: string) => {
    const numeric = val.replace(/[^0-9.]/g, '');
    const parts = numeric.split('.');
    if (parts.length > 2) return value; // Prevent multiple decimals
    
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (parts.length === 2) {
      return `${integerPart}.${parts[1].slice(0, 2)}`; // Limit to 2 decimal places
    }
    return integerPart;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    onChange(formatted);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary font-medium pointer-events-none">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          aria-invalid={hasError}
          aria-describedby={[hintId, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined}
          aria-required={required}
          className={`w-full bg-surface-base border ${hasError ? 'border-[var(--color-status-rose-border)]' : 'border-surface-border'} radius-input focus-app-field pl-7 pr-3 py-2.5 text-sm font-mono tnum text-content-primary placeholder:text-content-muted transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
        />
      </div>
      {hint && <p id={hintId} className="text-[10px] text-content-muted mt-1">{hint}</p>}
      {hasError && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
          <AlertCircle className="w-3 h-3" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
