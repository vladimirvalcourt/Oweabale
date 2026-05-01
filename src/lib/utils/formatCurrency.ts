/**
 * Currency Formatting Utilities
 * Internationalized currency display with proper locale support
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF';

export interface FormatCurrencyOptions {
  currency?: CurrencyCode;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const DEFAULT_CURRENCY: CurrencyCode = 'USD';
const DEFAULT_LOCALE = 'en-US';

/**
 * Format a number as currency string
 * @param amount - The numeric amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported locales/currencies
    console.warn(`Currency formatting failed: ${error}`);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format currency with sign indicator (+/-)
 * Useful for showing gains/losses or income/expenses
 */
export function formatCurrencyWithSign(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const formatted = formatCurrency(Math.abs(amount), options);
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${formatted}`;
}

/**
 * Format currency compactly (e.g., "$1.2K", "$3.5M")
 * Useful for dashboard summaries and charts
 */
export function formatCurrencyCompact(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch (error) {
    console.warn(`Compact currency formatting failed: ${error}`);
    return formatCurrency(amount, options);
  }
}

/**
 * Parse currency string back to number
 * Handles various formats: "$1,234.56", "€1.234,56", etc.
 */
export function parseCurrency(currencyString: string, currency: CurrencyCode = 'USD'): number {
  // Remove currency symbol and whitespace
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: CurrencyCode = 'USD'): string {
  const symbols: Record<CurrencyCode, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥',
    CHF: 'CHF',
  };
  return symbols[currency] || currency;
}
