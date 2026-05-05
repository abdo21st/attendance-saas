const CACHE_NAME = 'attendance-pwa-v1';
const urlsToCache = [
  '/',
  '/login',
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap'
];

// تنصيب Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// التعامل مع الطلبات (لجعل التطبيق يعمل أوفلاين أو يسرع التحميل)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // نُرجع النسخة المخزنة لو وجدت، وإلا نطلب من السيرفر
        return response || fetch(event.request);
      })
  );
});
