/* Service Worker eCatálogos: navegação offline e cache do Tailwind CDN. */
const CACHE = 'ecatalogos-pwa-v1';
const SHELL = ['./feiras.html', './manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Não impede a instalação caso o logo não exista ou a CDN esteja indisponível.
    await Promise.allSettled([
      cache.add('./logo.png'),
      cache.add('https://cdn.tailwindcss.com')
    ]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('ecatalogos-pwa-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca armazene em cache chamadas à API / status de confirmação.
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response.ok) (await caches.open(CACHE)).put(req, response.clone());
        return response;
      } catch (_) {
        return (await caches.match(req)) || (await caches.match('./feiras.html')) || Response.error();
      }
    })());
    return;
  }
  if (url.origin === self.location.origin || url.hostname === 'cdn.tailwindcss.com') {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const response = await fetch(req);
      if (response.ok || response.type === 'opaque') {
        (await caches.open(CACHE)).put(req, response.clone());
      }
      return response;
    })());
  }
});
