/** macOS, iOS, iPadOS — use ⌘ in shortcut hints; elsewhere use Ctrl. */
export function isApplePointerPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/.test(ua);
}
