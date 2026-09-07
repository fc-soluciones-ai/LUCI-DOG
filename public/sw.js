// Service worker compartido por /client, /admin y /groomer (cada uno lo registra
// con un scope distinto). Solo cachea GET: nunca intercepta Server Actions ni
// mutaciones (siempre POST).
const CACHE_NAME = 'groomingos-shell-v2'

function shellUrlsForScope(scopeUrl) {
  const path = new URL(scopeUrl).pathname
  if (path.startsWith('/client')) return ['/client', '/client/citas', '/client/mascotas', '/client/facturas', '/client/perfil']
  if (path.startsWith('/admin')) return ['/admin']
  if (path.startsWith('/groomer')) return ['/groomer']
  return [path]
}

self.addEventListener('install', (event) => {
  const shellUrls = shellUrlsForScope(self.registration.scope)
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(shellUrls))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Assets estáticos con hash de contenido: cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            return response
          })
      )
    )
    return
  }

  // Navegación entre páginas: network-first, cae al shell cacheado de ESTE scope si no hay red.
  if (request.mode === 'navigate') {
    const fallbackPath = new URL(self.registration.scope).pathname
    event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match(fallbackPath))))
  }
})
