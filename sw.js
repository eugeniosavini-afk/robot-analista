/* Robot Analista — service worker: la app funciona offline; las consultas a YouTube siempre van a la red. */
var VERSION = 'ra-v1.0.0';
var ARCHIVOS = ['./', './index.html', './privacidad.html', './manifest.json', './css/app.css', './js/app.js', './js/analisis.js', './js/youtube.js',
  './js/licencia.js', './js/demo.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // API de YouTube y miniaturas: red directa
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) {
    var red = fetch(e.request).then(function (resp) {
      if (resp && resp.ok) { var copia = resp.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copia); }); }
      return resp;
    }).catch(function () { return r || caches.match('./index.html'); });
    return r || red;
  }));
});
