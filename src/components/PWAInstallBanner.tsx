import { useEffect, useRef, useState } from 'react';
import { Download, MonitorSmartphone, X } from 'lucide-react';
import { toast } from 'sonner';

const DISMISSED_KEY = 'pwa_install_dismissed';

// The BeforeInstallPromptEvent is not in standard TS lib
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function PWAInstallBanner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Don't show if user already dismissed or is already in standalone mode
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone === true) return;

    const handler = (e: Event) => {
      e.preventDefault();
      if (mountedRef.current) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('Oweable installed! Find it in your dock or taskbar.');
        setVisible(false);
      }
    } finally {
      if (mountedRef.current) {
        setInstalling(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  // Only show on /pro/* routes for logged-in users
  if (!isLoggedIn || !visible || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Oweable app"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
      style={{
        // Slide-up animation via inline style for zero dependency
        animation: 'pwa-banner-slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) both',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-lg border border-surface-border bg-surface-raised px-4 py-3 xl:shadow-2xl"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-surface-border bg-surface-base text-content-primary">
          <MonitorSmartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-content-primary tracking-tight">Install Oweable</p>
          <p className="text-[11px] text-content-secondary mt-0.5">Quick access from your desktop or dock</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installing}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-cta px-3 py-1.5 text-[11px] font-medium text-surface-base transition-colors hover:bg-brand-cta-hover disabled:opacity-60 shadow-sm"
          >
            <Download className="h-3 w-3" />
            {installing ? 'Installing…' : 'Install'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Not now"
            className="rounded-md p-1.5 text-content-tertiary hover:bg-content-primary/5 hover:text-content-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pwa-banner-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
