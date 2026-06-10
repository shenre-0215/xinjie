// PWA Service Worker — 心解
// 缓存策略: 核心资源优先缓存，API 请求走网络

const CACHE_NAME = 'xinjie-v1';

// 安装时预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/globals.css',
        '/manifest.json',
      ]);
    })
  );
  // 立即接管，不等待旧 SW
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  // 立即控制所有页面
  self.clients.claim();
});

// 请求拦截: 网络优先，失败时回退缓存
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和 chrome-extension
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 缓存成功的 GET 请求（仅同源资源）
        if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 离线时回退缓存
        return caches.match(event.request);
      })
  );
});
