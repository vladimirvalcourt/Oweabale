/**
 * usePWAStandaloneMode
 *
 * When the app is launched as an installed PWA (display: standalone),
 * adds a `pwa-mode` CSS class to <body>. This enables CSS rules
 * that compensate for the absence of browser chrome (e.g. extra top
 * padding on iOS to clear the status bar via safe-area-inset-top).
 */
import { useEffect } from 'react';

export function usePWAStandaloneMode() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      document.body.classList.add('pwa-mode');
    }

    // Also listen for the display-mode to change (e.g. user adds to home mid-session)
    const mql = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => {
      document.body.classList.toggle('pwa-mode', e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
}
