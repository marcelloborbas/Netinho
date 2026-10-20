// Network-first PWA service worker. Never cache authenticated HTML or application bundles.
// Cached navigation documents can leave installed Android apps stuck on their splash screen.
const CACHE_NAME = "netinho-network-v3";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});
// All requests go directly to the network; the browser handles offline errors.
