// Firebase messaging service worker za push notifikacije
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase konfiguracija (ovo će biti dodano dinamički)
const firebaseConfig = {
  // Konfiguracija će biti dodana kada se postave Firebase credentials
};

// Inicijalizuj Firebase samo ako je konfigurisan
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('Received background message ', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data,
      actions: payload.data?.actions ? JSON.parse(payload.data.actions) : []
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Web Push notifikacije (VAPID)
self.addEventListener('push', function(event) {
  if (event.data) {
    const payload = event.data.json();
    
    const notificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      data: payload.data || {},
      actions: payload.actions || [],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, notificationOptions)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  if (action === 'view' && data.url) {
    event.waitUntil(
      clients.openWindow(data.url)
    );
  } else if (data.url) {
    event.waitUntil(
      clients.openWindow(data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle push subscription
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed');
  // Ovde možemo ažurirati subscription na serveru
});