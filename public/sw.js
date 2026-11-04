// Cache seguro para acelerar a segunda abertura do aplicativo no Android.
// Nunca armazenar HTML, APIs, sessões, respostas do Supabase ou dados privados.
const CACHE_NAME = "netinho-static-v4";
const STATIC_PATH = /^\/assets\/[^/]+\.(?:js|css|woff2?|png|jpe?g|webp|svg|gif|ico)$/i;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode === "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !STATIC_PATH.test(url.pathname)) return;

  // Apenas arquivos versionados pelo build. Evita reutilizar JS antigo após publicação.
  if (!/[.-][a-zA-Z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|webp|svg|gif|ico)$/i.test(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
