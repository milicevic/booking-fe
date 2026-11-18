self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'Booking', {
        body: data.body || '',
        icon: data.icon || '/icon-192.png',
        data: data.data ?? {},
      }),
      // Otvorene kartice odmah osvežavaju podatke (useLiveRefresh), bez čekanja na sledeću proveru
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((windows) => windows.forEach((client) => client.postMessage({ type: 'push', data: data.data ?? {} }))),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
