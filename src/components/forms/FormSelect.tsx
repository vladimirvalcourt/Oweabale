import React from 'react';

/**
 * Props for FormSelect component.
 * 
 * @interface FormSelectProps
 */
interface FormSelectProps {
    /** Unique identifier for the select element (used for label association) */
    id: string;
    /** Label text displayed above the select field */
    label: string;
    /** Currently selected value */
    value: string;
    /** Callback fired when selection changes */
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    /** Option elements to render inside the select */
    children: React.ReactNode;
    /** Whether this field is required (adds asterisk and validation) */
    required?: boolean;
    /** Whether the select is disabled and non-interactive */
    disabled?: boolean;
    /** Additional CSS classes to apply to the select element */
    className?: string;
}

/**
 * Reusable select dropdown field with label, ARIA support, and consistent styling.
 * 
 * Follows DESIGN.md standards for form fields with proper focus states,
 * hover effects, and accessibility attributes.
 * 
 * @example
 * ```tsx
 * <FormSelect
 *   id="category"
 *   label="Category"
 *   value={category}
 *   onChange={(e) => setCategory(e.target.value)}
 *   required
 * >
 *   <option value="food">Food & Dining</option>
 *   <option value="transport">Transportation</option>
 * </FormSelect>
 * ```
 * 
 * @param props - Component props
 * @returns Select field with label and options
 */
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
