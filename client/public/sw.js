const CACHE_NAME = 'servis-todosijevic-v2025.1.18';
const STATIC_CACHE_NAME = 'servis-static-v2025.1.18';
const DYNAMIC_CACHE_NAME = 'servis-dynamic-v2025.1.18';

// Osnovni resursi za cache
const CORE_FILES = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/offline.html'
];

// API rute koje ne treba cache-ovati
const NO_CACHE_URLS = [
  '/api/auth',
  '/api/logout', 
  '/api/push-notifications',
  '/api/analytics'
];

console.log('[SW] Service Worker za Servis Todosijević učitan v2025.1.18');

// Install event - cache osnovne resurse
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core files');
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        console.log('[SW] Core files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
});

// Activate event - cleanup starih cache-ova
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const deletePromises = cacheNames.map((cacheName) => {
        if (cacheName !== STATIC_CACHE_NAME && 
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName.startsWith('servis-')) {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
      }).filter(Boolean);
      
      return Promise.all(deletePromises);
    })
    .then(() => {
      console.log('[SW] Service Worker activated and ready');
      return self.clients.claim();
    })
  );
});

// Fetch event - cache strategija
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Preskoči non-GET zahteve
  if (request.method !== 'GET') {
    return;
  }
  
  // Preskoči no-cache URLs
  if (NO_CACHE_URLS.some(noCache => url.pathname.startsWith(noCache))) {
    return;
  }
  
  // Cache strategija
  if (url.pathname.startsWith('/api/')) {
    // API zahtevi - Network First strategija
    event.respondWith(networkFirstStrategy(request));
  } else if (CORE_FILES.includes(url.pathname) || 
             url.pathname.includes('.png') || 
             url.pathname.includes('.jpg') || 
             url.pathname.includes('.css') ||
             url.pathname.includes('.js')) {
    // Statični resursi - Cache First strategija
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // HTML stranice - Network First sa fallback-om
    event.respondWith(networkFirstWithFallback(request));
  }
});

// Cache First strategija za statične resurse
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return new Response('Resource not available offline', { 
      status: 503,
      statusText: 'Service Unavailable' 
    });
  }
}

// Network First strategija za API pozive
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.url.includes('/api/')) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network first fallback to cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ 
      error: 'Nema internetske konekcije',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Network First sa fallback za HTML stranice
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback na offline stranicu
    return caches.match('/offline.html') || 
           new Response('Aplikacija je offline', { 
             status: 503,
             headers: { 'Content-Type': 'text/html' }
           });
  }
}

// Background Sync za kasnije slanje podataka
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-services') {
    event.waitUntil(syncPendingServices());
  }
});

async function syncPendingServices() {
  // Implementacija za sinhronizaciju pending servisa
  console.log('[SW] Syncing pending services...');
}

// Share Target API
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHARE_TARGET') {
    console.log('[SW] Share target activated:', event.data);
    
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients && clients.length) {
          clients[0].postMessage({
            type: 'SHARED_CONTENT',
            data: event.data
          });
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

// Periodic background sync (ako je podržan)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  console.log('[SW] Periodic sync triggered');
  // Ovde možemo dodati logiku za periodičnu sinhronizaciju
}