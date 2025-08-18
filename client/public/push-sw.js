// Push Notifications Service Worker za Servis Todosijević
console.log('[SW] Push Notifications Service Worker učitan');

// Rukovanje push događajima
self.addEventListener('push', (event) => {
  console.log('[SW] Push notifikacija primljena:', event);

  let notificationData = {
    title: 'Servis Todosijević',
    body: 'Nova notifikacija',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {}
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('[SW] Parsovani podaci notifikacije:', notificationData);
    } catch (e) {
      console.error('[SW] Greška pri parsovanju push podataka:', e);
      notificationData.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon-192.png',
    badge: notificationData.badge || '/icon-192.png',
    data: notificationData.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      {
        action: 'open_app',
        title: 'Otvori aplikaciju',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Odbaci'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Rukovanje klikom na notifikaciju
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notifikacija kliknuta:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Otvori aplikaciju ili fokusiraj postojeći tab
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Traži postojeći tab sa aplikacijom
      for (const client of clientList) {
        if (client.url.includes('replit') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Ako nema postojećeg taba, otvori novi
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Rukovanje zatvaranjem notifikacije
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notifikacija zatvorena:', event);
});