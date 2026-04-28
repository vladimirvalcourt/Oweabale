import React from 'react';

interface ThemeBackdropProps {
  onClick?: () => void;
  className?: string;
}

/**
 * Theme-aware backdrop overlay for modals and dialogs
 * Automatically adjusts opacity based on light/dark mode
 */
export function ThemeBackdrop({ onClick, className = '' }: ThemeBackdropProps) {
  return (
    <div
      className={`fixed inset-0 backdrop-overlay ${className}`}
      onClick={onClick}
      aria-hidden="true"
    />
  );
}
