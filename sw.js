// ============================================================
// Service Worker для WorkSpace — кэш-first, офлайн, stale-while-revalidate
// ============================================================
const CACHE = 'workspace-v1';
const ASSETS = [
   './',
   './index.html',
   './css/style.css',
   './css/performance.css',
   './js/index.js',
   './js/menu.js',
   './js/theme.js',
   './js/adaptive-loader.js',
   './data/subjects.json',
   './fonts/montserrat-v26-latin-400.woff2',
   './fonts/montserrat.css',
];

self.addEventListener('install', (event) => {
   event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
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
   const url = new URL(request.url);

   // GitHub API — только сеть (или кэш при офлайне), без долгого хранения
   if (url.hostname === 'api.github.com') {
      event.respondWith(networkFirst(request));
      return;
   }

   // Статика, HTML, JSON, шрифты — кэш-first с фоновым обновлением
   event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
   const cached = await caches.match(request);
   const networkPromise = fetch(request).then((response) => {
      if (response.ok) {
         const clone = response.clone();
         caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
   });
   return cached || networkPromise;
}

async function networkFirst(request) {
   try {
      return await fetch(request);
   } catch {
      return caches.match(request);
   }
}
