import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Step 8: PWAUpdateNotifier
 * Watches for new service worker deployments and prompts the user
 * to reload. Shows a persistent toast with a "Reload now" action.
 */
export function PWAUpdateNotifier() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Poll for updates every 60 minutes in case user has the tab open long-term
      if (r) {
        setInterval(() => {
          void r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration error:', error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast('Oweable was updated — reload for the latest version.', {
      id: 'pwa-update',
      duration: Infinity,
      action: {
        label: 'Reload now',
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
