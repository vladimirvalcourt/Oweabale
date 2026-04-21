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
      if (!r) return;
      // Poll for updates every hour. Store ID so it can be cleared by the browser
      // when the page unloads (GC will handle it; unlike a leaked naked setInterval).
      const id = setInterval(() => void r.update(), 60 * 60 * 1000);
      // Attach to the registration object so we aren't holding a closure leak
      (r as ServiceWorkerRegistration & { _updateIntervalId?: ReturnType<typeof setInterval> })
        ._updateIntervalId = id;
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
