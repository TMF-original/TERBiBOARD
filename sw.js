// TERBiBOARD · Copyright (C) 2026 DocTERBi (TERBi Teaching) · SPDX-License-Identifier: GPL-3.0-only
// Service Worker: hält die App offline verfügbar. Bei Änderungen VERSION erhöhen.
const VERSION = 'terbiboard-2026-10-20-1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'katex.min.js', 'manifest.webmanifest',
               'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'logo.png', 'pdf.min.js', 'pdf.worker.min.js', 'handbuch.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Netz zuerst (damit Updates sofort ankommen), offline aus dem Cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
