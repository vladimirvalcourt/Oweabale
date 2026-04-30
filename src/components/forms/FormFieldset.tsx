import React from 'react';

/** Reusable fieldset wrapper for grouping related inputs */
interface FormFieldsetProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}

export function FormFieldset({ legend, children, className = '', hint }: FormFieldsetProps) {
  const hintId = hint ? `fieldset-${legend.toLowerCase().replace(/\s+/g, '-')}-hint` : undefined;

  return (
    <fieldset className={`rounded-lg border border-surface-border bg-surface-base p-3 ${className}`}>
      <legend className="text-xs font-sans font-medium text-content-tertiary mb-2">{legend}</legend>
      {children}
      {hint && <p id={hintId} className="text-xs text-content-muted mt-2 leading-snug">{hint}</p>}
    </fieldset>
  );
}
