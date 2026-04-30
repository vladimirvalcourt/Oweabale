import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { browserSupportsModernWebCrypto } from '@/lib/utils';

/**
 * Shown when the runtime cannot use PKCE / Web Crypto (legacy browsers, some embedded WebViews).
 * Hidden when running as an installed PWA since authentication already succeeded.
 */
export function UnsupportedBrowserBanner() {
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    // Don't show warning if running as installed PWA (user already authenticated successfully)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    
    if (isStandalone) {
      setUnsupported(false);
      return;
    }
    
    setUnsupported(!browserSupportsModernWebCrypto());
  }, []);

  if (!unsupported) return null;

  return (
    <div
      role="alert"
      className="border-b border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] px-4 py-3 text-center text-sm text-[var(--color-status-amber-text)]"
    >
      <p className="mx-auto flex max-w-3xl items-start justify-center gap-2 leading-relaxed">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-status-amber-text)]" aria-hidden />
        <span>
          This browser cannot run secure sign-in (missing modern cryptography). Use an up-to-date Chrome,
          Firefox, Safari, or Edge, or open Oweable in your system browser instead of an in-app WebView.
        </span>
      </p>
    </div>
  );
}
