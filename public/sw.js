/* eslint-disable no-restricted-globals */
/** Minimal Oweable service worker.
 *
 * Responsibilities:
 *   1. NavigationPreload — eliminates SW boot latency on page navigations (Fix 5)
 *   2. Web Push — shows push payloads from the server
 */

// ── Fix 5: NavigationPreload ──────────────────────────────────────────────────
// Without this, every navigate request waits for the SW to start before the
// browser can even open the network connection (~50-100 ms dead time on cold SW).
// NavigationPreload fires the navigation fetch IN PARALLEL with SW startup.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      // Take control of all clients immediately so NavigationPreload applies
      // to the first load (not just subsequent navigations).
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept same-origin navigation requests (page loads / React Router navigations).
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        // Use the preload response when available (parallel with SW boot).
        const preload = await event.preloadResponse;
        if (preload) return preload;
      } catch {
        // Preload not supported or network failure — fall through to normal fetch.
      }
      return fetch(event.request);
    })()
  );
});

// ── Web Push ──────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Oweable', body: '' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        data = {
          title: typeof parsed.title === 'string' ? parsed.title : data.title,
          body: typeof parsed.body === 'string' ? parsed.body : JSON.stringify(parsed),
        };
      }
    }
  } catch {
    try {
      data.body = event.data?.text() ?? '';
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/favicon.svg' }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
