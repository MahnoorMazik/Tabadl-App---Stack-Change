// Loaded by sw.js via workbox importScripts — Web Push display + click handling.

var NOTIFICATION_ICON = '/icons/icon-192x192.png'

function resolveNotificationPath(url) {
  if (!url || typeof url !== 'string') return '/admin/notifications'
  try {
    return new URL(url, self.location.origin).pathname
  } catch {
    return url.startsWith('/') ? url.split('?')[0] : '/admin/notifications'
  }
}

function parsePushPayload(event) {
  var fallback = {
    title: 'TK CRM',
    body: 'You have a new notification',
    url: '/admin/notifications',
  }
  if (!event.data) return fallback
  try {
    var json = event.data.json()
    return {
      title: json.title || fallback.title,
      body: json.body || json.message || fallback.body,
      url: (json.data && json.data.url) || json.url || fallback.url,
    }
  } catch (e) {
    var text = ''
    try { text = event.data.text() } catch (e2) { /* ignore */ }
    return { title: fallback.title, body: text || fallback.body, url: fallback.url }
  }
}

self.addEventListener('push', function (event) {
  var payload = parsePushPayload(event)
  var title = payload.title
  var targetPath = resolveNotificationPath(payload.url)
  var iconUrl = new URL(NOTIFICATION_ICON, self.location.origin).href

  var options = {
    body: payload.body,
    icon: iconUrl,
    badge: iconUrl,
    tag: targetPath,
    renotify: true,
    data: { url: targetPath },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(title, options).catch(function (err) {
      console.error('[sw] showNotification failed:', err)
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var targetPath = resolveNotificationPath(
    event.notification.data && event.notification.data.url
  )

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        try {
          var clientPath = new URL(client.url).pathname
          if (clientPath === targetPath && 'focus' in client) {
            return client.focus()
          }
        } catch { /* skip */ }
      }
      return self.clients.openWindow(targetPath)
    })
  )
})
