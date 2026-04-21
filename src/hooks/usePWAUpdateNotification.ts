/**
 * usePWAUpdateNotification
 *
 * Listens for new service worker versions via vite-plugin-pwa's
 * useRegisterSW hook and shows a dismissable toast with a
 * "Reload now" action when an update is ready.
 */
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function usePWAUpdateNotification() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Optional: set an interval to check for updates every hour
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration error:', error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    toast.info('Oweable was updated.', {
      description: 'Reload for the latest version.',
      duration: Infinity,
      action: {
        label: 'Reload now',
        onClick: () => updateServiceWorker(true),
      },
    });
  }, [needRefresh, updateServiceWorker]);
}
