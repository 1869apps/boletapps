/**
 * BoletApps - Service Worker
 * Soporte offline completo: cache-first para app shell,
 * network-first para datos dinámicos externos (no aplica por ahora).
 */
const CACHE_NAME = 'boletapps-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/db.js',
  './js/share.js',
  './js/app.js',
  './lib/chart.min.js',
  './lib/jspdf.umd.min.js',
  './lib/xlsx.full.min.js',
  './lib/FileSaver.min.js'
];

// Instalación: precachear app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('SW install error:', err))
  );
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: estrategia cache-first con fallback a network
self.addEventListener('fetch', (event) => {
  // Solo GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests de chrome-extension y ws
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Estrategia: cache-first, luego network (y actualizar cache)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Devolver cache y actualizar en background
        fetch(event.request).then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }).catch(() => {});
        return cached;
      }
      // No está en cache: ir a la red
      return fetch(event.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') {
          return resp;
        }
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return resp;
      }).catch(() => {
        // Offline y sin cache: devolver página offline simple
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
