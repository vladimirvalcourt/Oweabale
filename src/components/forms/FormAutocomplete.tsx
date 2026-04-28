import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormAutocompleteProps {
  id: string;
  label: string | React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  suggestions: string[];
  maxLength?: number;
  hint?: string;
}

export function FormAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
  suggestions,
  maxLength,
  hint,
}: FormAutocompleteProps) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const hasError = !!error;
  const charCount = maxLength !== undefined ? value.length : 0;
  const showProgress = maxLength !== undefined;
  const progressPercentage = maxLength ? (charCount / maxLength) * 100 : 0;
  const isNearLimit = progressPercentage > 75;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (value.trim()) {
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, suggestions]);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          e.preventDefault();
          handleSelect(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(filteredSuggestions.length - 1);
        break;
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.trim() && filteredSuggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={[hasError ? errorId : undefined, hintId, maxLength ? `${id}-count` : undefined].filter(Boolean).join(' ') || undefined}
        aria-required={required}
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
        className={`w-full bg-surface-base border ${hasError ? 'border-red-500/50' : 'border-surface-border'} radius-input focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
      />
      {showSuggestions && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          ref={listboxRef}
          className="absolute z-50 w-full mt-1 bg-surface-elevated border border-surface-border radius-card shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                highlightedIndex === index
                  ? 'bg-brand-indigo/20 text-content-primary'
                  : 'text-content-secondary hover:bg-surface-hover'
              }`}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      {hint && <p id={hintId} className="text-[10px] text-content-muted mt-1">{hint}</p>}
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
