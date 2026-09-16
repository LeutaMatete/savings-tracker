self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data
    ? event.data.json()
    : { title: 'FOD', body: 'You have an update' };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FOD', {
      body: data.body,
      tag: 'fod-briefing',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});