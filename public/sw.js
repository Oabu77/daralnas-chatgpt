// Service Worker for DarCloud AI Assistant
// Enables offline functionality and always-on capabilities
// AUTO-ALLOW: No permissions needed, always accessible

const CACHE_NAME = 'darcloud-ai-v1';
const RUNTIME_CACHE = 'darcloud-runtime-v1';

// Critical assets to cache for offline use
const PRECACHE_ASSETS = [
  '/assistant',
  '/assistant.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - precache critical assets, auto-skip waiting
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing... AUTO-ALLOW mode');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS).catch(() => {
          console.log('[ServiceWorker] Some assets failed to cache, continuing anyway');
        });
      })
      .then(() => {
        console.log('[ServiceWorker] Skipping waiting - activating immediately');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches, auto-claim clients
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating... AUTO-CLAIM all clients');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming all clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first, cache as backup
  if (url.pathname.startsWith('/chatgpt') || 
      url.pathname.startsWith('/oliveexpress') ||
      url.pathname.startsWith('/fungi')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - cache first, network as backup
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New message from DarCloud AI',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('DarCloud AI Assistant', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/assistant')
    );
  }
});

// Sync offline messages when back online
async function syncMessages() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/chatgpt')) {
        await fetch(request);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-status') {
    event.waitUntil(checkNetworkStatus());
  }
});

async function checkNetworkStatus() {
  try {
    const response = await fetch('/fungi/sentinel/status');
    if (response.ok) {
      const data = await response.json();
      // Store status for offline access
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put('/fungi/sentinel/status', new Response(JSON.stringify(data)));
    }
  } catch (error) {
    console.error('[ServiceWorker] Status check failed:', error);
  }
}
