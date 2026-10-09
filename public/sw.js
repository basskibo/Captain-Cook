// Captain Cook service worker — offline pristup aplikaciji i sačuvanim receptima.
// Podaci (recepti, lista…) su u localStorage, pa je dovoljno da se keširaju HTML i statički fajlovi.
const CACHE = "cc-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch {
    return (await cache.match(fallbackUrl ?? request)) ?? (await cache.match("/")) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API (AI, sesija, sinhronizacija) uvek ide na mrežu — nikad iz keša.
  if (url.pathname.startsWith("/api/")) return;

  // Stranica: prvo mreža (sveža verzija), offline → keširana.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  // Next.js statički fajlovi imaju hash u imenu → sigurno za trajni keš.
  if (url.pathname.startsWith("/_next/static/") || /\.(svg|png|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
