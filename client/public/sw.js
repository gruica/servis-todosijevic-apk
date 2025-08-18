// Service Worker za Frigo Sistem Todosijević - 2025 Performance Optimized
const CACHE_NAME = 'frigo-sistem-v2025.1.0';
const STATIC_CACHE = 'frigo-static-v2025.1.0';
const DYNAMIC_CACHE = 'frigo-dynamic-v2025.1.0';
const IMAGE_CACHE = 'frigo-images-v2025.1.0';

// URLs koje treba cache-ovati odmah
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/auth',
  '/business-auth',
  '/offline.html' // Kreirane ću offline stranicu
];

// API endpoints za cache strategiju
const API_PATTERNS = [
  /\/api\/jwt-user/,
  /\/api\/health/,
  /\/api\/categories/,
  /\/api\/manufacturers/
];

// Install event - cache kritičnih resursa
self.addEventListener('install', event => {
  console.log('🚀 Service Worker: Installing v2025.1.0');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Preload kritičnih API poziva
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('⚡ Service Worker: Preloading critical APIs');
        return Promise.allSettled([
          fetch('/api/health').then(response => {
            if (response.ok) cache.put('/api/health', response.clone());
          }),
          fetch('/api/categories').then(response => {
            if (response.ok) cache.put('/api/categories', response.clone());
          }),
          fetch('/api/manufacturers').then(response => {
            if (response.ok) cache.put('/api/manufacturers', response.clone());
          })
        ]);
      })
    ])
  );
  
  // Forsiraj aktivaciju novog SW-a
  self.skipWaiting();
});

// Activate event - obriši stare cache-ove
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activating v2025.1.0');
  
  event.waitUntil(
    Promise.all([
      // Obriši stare cache-ove
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(cacheName)) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Preuzmi kontrolu nad svim tab-ovima
      self.clients.claim()
    ])
  );
});

// Fetch event - pametna cache strategija
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignoriši non-GET zahteve i chrome-extension pozive
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Različite strategije za različite tipove resursa
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Strategija za API pozive - Network First sa fallback na cache
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Pokušaj network zahtev
    const networkResponse = await fetch(request);
    
    // Cache-uj uspešne odgovore za određene endpoint-ove
    if (networkResponse.ok && shouldCacheAPI(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Service Worker: Network failed for API, trying cache:', url.pathname);
    
    // Ako network ne radi, pokušaj cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ako nema cache-a, vrati error response
    return new Response(JSON.stringify({
      error: 'Nema internet konekcije',
      cached: false,
      timestamp: Date.now()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Strategija za slike - Cache First sa lazy loading
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🖼️ Service Worker: Image load failed:', request.url);
    
    // Vrati placeholder sliku
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" fill="#f0f0f0"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Slika se učitava...</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Strategija za statičke resurse - Cache First
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📄 Service Worker: Static asset failed:', request.url);
    throw error;
  }
}

// Strategija za stranice - Network First sa offline fallback
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache-uj uspešne stranice
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Service Worker: Page load failed, trying cache:', request.url);
    
    // Pokušaj cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ako nema cache-a, vrati offline stranicu
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Finalni fallback
    return new Response(`
      <!DOCTYPE html>
      <html lang="sr-RS">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Frigo Sistem - Offline</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .offline-container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .logo { font-size: 24px; color: #4682B4; font-weight: bold; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 20px; }
          .retry-btn { background: #4682B4; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="logo">Frigo Sistem Todosijević</div>
          <h2>Nema internet konekcije</h2>
          <p class="message">Molimo proverite internetsku konekciju i pokušajte ponovo.</p>
          <button class="retry-btn" onclick="window.location.reload()">Pokušaj ponovo</button>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 503
    });
  }
}

// Pomoćne funkcije
function shouldCacheAPI(pathname) {
  return API_PATTERNS.some(pattern => pattern.test(pathname));
}

// Background sync za offline akcije
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implementacija background sync logike
  console.log('⚡ Service Worker: Performing background sync...');
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const options = {
    body: event.data.text(),
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'frigo-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Otvori' },
      { action: 'close', title: 'Zatvori' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Frigo Sistem Todosijević', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Poruke između SW i main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🎯 Service Worker: Frigo Sistem v2025.1.0 ready');