const CACHE = 'workspace-v2';
const ASSETS = [
   './',
   './index.html',
   './lab.html',
   './css/style.css',
   './css/performance.css',
   './js/index.js',
   './js/menu.js',
   './js/theme.js',
   './js/adaptive-loader.js',
   './data/subjects.json',
];

self.addEventListener('install', (event) => {
   event.waitUntil(
      caches
         .open(CACHE)
         .then((cache) => cache.addAll(ASSETS))
         .catch((err) => {
            console.warn('SW install cache failed:', err);
         }),
   );
});

self.addEventListener('activate', (event) => {
   event.waitUntil(
      caches
         .keys()
         .then((keys) =>
            Promise.all(
               keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
            ),
         ),
   );
});

self.addEventListener('fetch', (event) => {
   const { request } = event;

   if (request.method !== 'GET') return;

   const url = new URL(request.url);

   if (url.hostname === 'api.github.com') {
      event.respondWith(networkFirst(request));
      return;
   }

   event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
   const cached = await caches.match(request);
   try {
      const network = await fetch(request);
      if (network.ok) {
         const clone = network.clone();
         caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return network;
   } catch {
      return (
         cached ||
         new Response('Offline', { status: 503, statusText: 'Offline' })
      );
   }
}

async function networkFirst(request) {
   try {
      return await fetch(request);
   } catch {
      return (
         caches.match(request) ||
         new Response('Offline', { status: 503, statusText: 'Offline' })
      );
   }
}
