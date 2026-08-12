self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'FOD', body: 'You have an update' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'FOD', {
      body: data.body,
      tag: 'fod-briefing',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});