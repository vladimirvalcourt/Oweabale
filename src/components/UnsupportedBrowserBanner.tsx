import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { browserSupportsModernWebCrypto } from '../lib/browserSupport';

/**
 * Shown when the runtime cannot use PKCE / Web Crypto (legacy browsers, some embedded WebViews).
 */
export function UnsupportedBrowserBanner() {
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    setUnsupported(!browserSupportsModernWebCrypto());
  }, []);

  if (!unsupported) return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 text-center text-sm text-amber-100"
    >
      <p className="mx-auto flex max-w-3xl items-start justify-center gap-2 leading-relaxed">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <span>
          This browser cannot run secure sign-in (missing modern cryptography). Use an up-to-date Chrome,
          Firefox, Safari, or Edge, or open Oweable in your system browser instead of an in-app WebView.
        </span>
      </p>
    </div>
  );
}
