/** Map legacy display labels (pre–IANA) to IANA identifiers. */
export const LEGACY_TIMEZONE_TO_IANA: Record<string, string> = {
  'Eastern Time (ET)': 'America/New_York',
  'Pacific Time (PT)': 'America/Los_Angeles',
  'Central Time (CT)': 'America/Chicago',
  'Mountain Time (MT)': 'America/Denver',
  'Greenwich Mean Time (GMT)': 'Europe/London',
};

export function normalizeTimezoneToIana(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return 'America/New_York';
  if (LEGACY_TIMEZONE_TO_IANA[raw]) return LEGACY_TIMEZONE_TO_IANA[raw];
  if (raw.includes('/')) return raw;
  return 'America/New_York';
}

export function getIanaTimezoneOptions(): string[] {
  try {
    const IntlWithValues = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    if (typeof IntlWithValues.supportedValuesOf === 'function') {
      return IntlWithValues.supportedValuesOf('timeZone').slice().sort((a, b) => a.localeCompare(b));
    }
  } catch {
    /* ignore */
  }
  return Object.values(LEGACY_TIMEZONE_TO_IANA);
}
