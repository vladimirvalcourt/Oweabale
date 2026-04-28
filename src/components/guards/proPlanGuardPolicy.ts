export function isBillingLockBypass(pathname: string, search: string): boolean {
  if (pathname !== '/pro/settings') return false;
  return new URLSearchParams(search).get('tab') === 'billing';
}
