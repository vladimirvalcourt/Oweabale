/* eslint-disable no-restricted-globals */
/** Minimal Web Push service worker — shows push payloads from the server. */
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
