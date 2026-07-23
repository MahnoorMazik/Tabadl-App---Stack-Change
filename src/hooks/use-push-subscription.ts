'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type PushStatus = 'unsupported' | 'default' | 'denied' | 'granted' | 'subscribed' | 'unsubscribed' | 'error'

interface UsePushSubscriptionReturn {
  status: PushStatus
  isSupported: boolean
  isSubscribed: boolean
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  error: string | null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Compare two VAPID keys (ArrayBuffer vs Uint8Array) */
function vapidKeysMatch(
  subKey: ArrayBuffer | null | undefined,
  serverKey: Uint8Array
): boolean {
  if (!subKey || subKey.byteLength !== serverKey.length) return false
  const a = new Uint8Array(subKey)
  for (let i = 0; i < serverKey.length; i++) {
    if (a[i] !== serverKey[i]) return false
  }
  return true
}

export function usePushSubscription(token: string | null): UsePushSubscriptionReturn {
  const [status, setStatus] = useState<PushStatus>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  const checkSubscription = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported')
      return
    }

    try {
      const permission = Notification.permission
      setStatus(permission)

      if (permission !== 'granted') {
        setIsSubscribed(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
      setStatus(subscription ? 'subscribed' : 'granted')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to check subscription')
    }
  }, [isSupported])

  const autoSubscribeAttempted = useRef(false)

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push not supported')
      return false
    }

    setError(null)
    try {
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
        setStatus(permission)
      }

      if (permission !== 'granted') {
        setError('Notification permission denied')
        setStatus('denied')
        return false
      }

      const vapidRes = await fetch('/api/push/subscribe')
      if (!vapidRes.ok) {
        const data = await vapidRes.json().catch(() => ({}))
        const msg = vapidRes.status === 503
          ? "Server not configured for push. Run 'pnpm run setup:vapid' and add keys to .env, then restart."
          : (data.error || 'Push not configured')
        setError(msg)
        return false
      }

      const { publicKey } = await vapidRes.json()
      if (!publicKey) {
        setError('VAPID key not available')
        return false
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      const applicationServerKey = urlBase64ToUint8Array(publicKey)

      // If existing subscription was created with a different VAPID key (e.g. after deploy),
      // we must unsubscribe and remove from backend - otherwise push fails for that device
      // and only newly-subscribed devices receive notifications
      if (subscription && !vapidKeysMatch(subscription.options?.applicationServerKey, applicationServerKey)) {
        const oldEndpoint = subscription.endpoint
        await subscription.unsubscribe()
        subscription = null
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (token) headers['Authorization'] = `Bearer ${token}`
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers,
            credentials: 'include',
            body: JSON.stringify({ endpoint: oldEndpoint }),
          })
        } catch {
          /* best-effort cleanup */
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
        })
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to save subscription')
        return false
      }

      setIsSubscribed(true)
      setStatus('subscribed')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed')
      setStatus('error')
      return false
    }
  }, [isSupported, token])

  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  // Sync subscription on every admin visit - ensures this device's subscription is in the backend.
  // Must run even when already "subscribed" so we: (1) handle VAPID key changes, (2) ensure
  // backend has this device. Without this, only the last-used device receives notifications.
  useEffect(() => {
    if (!isSupported || autoSubscribeAttempted.current) return
    if (status === 'denied' || status === 'unsupported') return
    autoSubscribeAttempted.current = true
    subscribe()
  }, [isSupported, status, subscribe])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    setError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers,
          credentials: 'include',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      setStatus(Notification.permission === 'granted' ? 'granted' : Notification.permission)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unsubscribe failed')
      return false
    }
  }, [isSupported, token])

  return {
    status,
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
    error,
  }
}
