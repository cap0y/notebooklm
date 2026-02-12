// Bump CACHE_VERSION when deploying to ensure clients get fresh assets
const CACHE_VERSION = Date.now();
const CACHE_NAME = `dcsoft-gw-${CACHE_VERSION}`;
const urlsToCache = ["/", "/manifest.json", "/images/decomsoft-logo.svg"];

// 개발환경 감지 (localhost 또는 개발 서버)
const isDevelopment =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.includes("192.168.") ||
  self.location.port !== "";

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
  // 개발환경에서는 캐시하지 않음
  if (isDevelopment) {
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(() => {}),
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 개발환경에서는 항상 네트워크 우선
  if (isDevelopment) {
    event.respondWith(fetch(req));
    return;
  }

  // Bypass non-GET
  if (req.method !== "GET") {
    event.respondWith(fetch(req));
    return;
  }

  // 외부 도메인(다른 origin) 요청은 Service Worker를 우회
  try {
    const url = new URL(req.url);
    const isSameOrigin = url.origin === self.location.origin;

    // 외부 도메인 요청은 처리하지 않음 (Google Fonts, CDN 등)
    if (!isSameOrigin) {
      return; // Service Worker를 우회하여 네트워크 요청이 직접 처리되도록 함
    }

    // API 호출은 항상 네트워크 우선
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(fetch(req));
      return;
    }
  } catch (_) {
    // URL 파싱 실패 시 네트워크 요청 통과
    return;
  }

  // Network-first for navigation and HTML
  if (
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html")
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME && name.startsWith("dcsoft-gw-")) {
              return caches.delete(name);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "새로운 알림이 있습니다",
    icon: "/images/decomsoft-logo.svg",
    badge: "/images/decomsoft-logo.svg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
    },
    actions: [
      {
        action: "explore",
        title: "확인하기",
        icon: "/images/decomsoft-logo.svg",
      },
      {
        action: "close",
        title: "닫기",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("디컴소프트", options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
