/**
 * Recur Service Worker（最简版）
 * - 仅做离线缓存静态资源，让 PWA 安装后能离线打开首页
 * - 浏览器通知通过 postMessage 从主页面接收
 */

const CACHE = "recur-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return (
        cached ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});

/* 接收主页面发来的通知请求 */
self.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type === "show-notification" && data.title) {
    self.registration.showNotification(data.title, {
      body: data.body || "",
      icon: "./static/icon-192.png",
      badge: "./static/icon-192.png",
      tag: data.tag || "recur",
      data: data.url || "/",
    });
  }
});

/* 点击通知 → 打开 app */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = e.notification.data || "/";
  e.waitUntil(clients.matchAll({ type: "window" }).then((wins) => {
    for (const w of wins) {
      if (w.url.endsWith(target)) return w.focus();
    }
    return clients.openWindow(target);
  }));
});
