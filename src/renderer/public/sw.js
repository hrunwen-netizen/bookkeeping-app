// Service Worker — 让记账 App 可以离线使用
const CACHE_NAME = 'jizhang-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('离线模式，请联网后重试')
    })
  )
})
