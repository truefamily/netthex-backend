const CACHE_NAME = 'netthex-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
]

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cache initialisé:', CACHE_NAME)
      return cache.addAll(ASSETS_TO_CACHE)
    }),
  )
  self.skipWaiting()
})

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Ancien cache supprimé:', cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Stratégie de cache: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return
  }

  // Pour les routes API: Network First
  if (request.url.includes('/api/') || request.url.includes('firebase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache les réponses réussies
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // En cas d'erreur réseau, retourner le cache
          return caches.match(request)
        }),
    )
  } else {
    // Pour les assets statiques: Cache First
    event.respondWith(
      caches
        .match(request)
        .then((response) => {
          if (response) {
            return response
          }
          return fetch(request).then((response) => {
            // Ne cacher que les réponses valides
            if (!response || response.status !== 200) {
              return response
            }
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
            return response
          })
        })
        .catch(() => {
          // Fallback si tout échoue
          return new Response('Offline - Ressource non disponible', {
            status: 503,
          })
        }),
    )
  }
})
