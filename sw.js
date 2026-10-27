/**
 * Service Worker для WorkSpace — офлайн поддержка и кэширование
 * Регистрируется в index.js / lab.js / sync-center.js
 */

const CACHE_NAME = "workspace-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/lab.html",
  "/sync.html",
  "/css/critical.css",
  "/css/theme.css",
  "/js/theme.js",
  "/js/menu.js",
  "/js/index.js",
  "/js/lab.js",
  "/js/sync-center.js",
  "/js/adaptive-loader.js",
  "/js/adaptive-store.js",
  "/js/admin/admin-loader.js",
  "/js/markdown-modal.js",
  "/fonts/README.md",
];

// !Ресурсы, которые кэшируем с network-first стратегией
const NETWORK_FIRST = ["/api/", "/data/"];

// !Ресурсы, которые кэшируем с cache-first стратегией
const CACHE_FIRST = [
  "/fonts/",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
];

// !Установка SW
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Кэширование статических ресурсов");
      return cache
        .addAll(
          STATIC_ASSETS.map((url) => {
            return new Request(url, { credentials: "same-origin" });
          }),
        )
        .catch((err) => {
          console.warn("[SW] Не удалось закэшировать некоторые ресурсы:", err);
        });
    }),
  );
  // Активируем SW сразу
  self.skipWaiting();
});

// !Активация — очистка старых кэшей
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Удаление старого кэша:", name);
            return caches.delete(name);
          }),
      );
    }),
  );
  // Принимаем контроль над всеми клиентами
  self.clients.claim();
});

// !Стратегия: Stale-While-Revalidate для статических ресурсов
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Запускаем фоновое обновление
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  // Возвращаем кэшированный ответ сразу, если есть
  return cachedResponse || fetchPromise;
}

// !Стратегия: Network First для API/данных
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback для навигации
    if (request.mode === "navigate") {
      return cache.match("/index.html");
    }
    throw error;
  }
}

// !Стратегия: Cache First для шрифтов и внешних ресурсов
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Фоновое обновление
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      })
      .catch(() => {});
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// !Основной fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы
  if (request.method !== "GET") {
    return;
  }

  // Пропускаем chrome-extension и другие схемы
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Определяем стратегию кэширования
  let handler;

  // Навигационные запросы — network first
  if (request.mode === "navigate") {
    handler = networkFirst(request);
  }
  // Статические ассеты из нашего списка — stale-while-revalidate
  else if (STATIC_ASSETS.some((asset) => request.url.includes(asset))) {
    handler = staleWhileRevalidate(request);
  }
  // Шрифты и внешние библиотеки — cache first
  else if (CACHE_FIRST.some((pattern) => request.url.includes(pattern))) {
    handler = cacheFirst(request);
  }
  // API и данные — network first
  else if (NETWORK_FIRST.some((pattern) => request.url.includes(pattern))) {
    handler = networkFirst(request);
  }
  // Остальное — stale-while-revalidate
  else {
    handler = staleWhileRevalidate(request);
  }

  event.respondWith(handler);
});

// !Обработка сообщений от клиента
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }

  if (event.data === "clearCache") {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((name) => caches.delete(name));
    });
  }
});

// !Push уведомления (если понадобятся)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "Новое уведомление от WorkSpace",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "WorkSpace", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    }),
  );
});
