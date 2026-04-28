import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormInputProps {
  id: string;
  label: string | React.ReactNode;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  step?: string;
  min?: string;
  maxLength?: number;
}

export function FormInput({ 
  id, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  error, 
  required, 
  disabled, 
  className = '',
  inputMode,
  step,
  min,
  maxLength,
}: FormInputProps) {
  const errorId = `${id}-error`;
  const hasError = !!error;
  const charCount = maxLength !== undefined ? value.length : 0;
  const showProgress = maxLength !== undefined;
  const progressPercentage = maxLength ? (charCount / maxLength) * 100 : 0;
  const isNearLimit = progressPercentage > 75;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        inputMode={inputMode}
        step={step}
        min={min}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : (showProgress ? `${id}-count` : undefined)}
        aria-required={required}
        className={`w-full bg-surface-base border ${hasError ? 'border-red-500/50' : 'border-surface-border'} radius-input focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border ${className}`}
      />
      {hasError && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5" role="alert" aria-live="polite">
          <AlertCircle className="w-3 h-3" aria-hidden />
          {error}
        </p>
      )}
      {showProgress && (
        <div className="mt-1.5">
          <div className="flex items-center justify-between mb-1">
            <p id={`${id}-count`} className={`text-[10px] font-mono ${isNearLimit ? 'text-amber-400' : 'text-content-muted'}`} aria-live="polite">
              {charCount}/{maxLength} characters
            </p>
            {isNearLimit && (
              <div className="flex-1 ml-2 h-1 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${progressPercentage > 90 ? 'bg-red-500' : 'bg-amber-400'}`}
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