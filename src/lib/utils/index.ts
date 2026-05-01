import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes.
 * Helps avoid class conflicts when composing UI components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as a currency string (USD).
 * @param amount - The number to format
 * @returns A formatted string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Re-export other utilities
export * from './analytics';
export * from './browserSupport';
export * from './cropAvatar';
export * from './customIcons';
export * from './dynamicImportErrors';
export * from './emailObfuscation';
export * from './interaction';
export * from './phoneInput';
export * from './platform';
export * from './platformTag';
export * from './rechartsTooltip';
export * from './timezones';
export * from './webVitalsReporting';
