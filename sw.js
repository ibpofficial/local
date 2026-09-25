/* =========================================================================
   GHOST FREQUENCY // SERVICE WORKER (PWA & BACKGROUND NOTIFICATION ENGINE)
   ========================================================================= */

const CACHE_NAME = 'ghost-freq-v2.5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Install & Cache Core Assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

// 2. Activate & Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Network First with Cache Fallback for PWA offline capability
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// 4. Background Push Notification Event Listener
self.addEventListener('push', (event) => {
  let data = { title: 'GHOST FREQUENCY', body: 'New encrypted mesh signal received.', tag: 'ghost-msg' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch(e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'ghost-msg',
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: data.url || './index.html',
    actions: [
      { action: 'open', title: '💬 Open Channel' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Notification Click Listener to bring user back into app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

// 6. Direct Message Handler from Client Page to trigger SW System Notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon } = event.data;
    self.registration.showNotification(title, {
      body: body,
      icon: icon || './icon-192.png',
      badge: './icon-192.png',
      tag: tag || 'ghost-msg',
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: false
    });
  }
});
