'use client'

import { usePushSubscription } from '@/hooks/use-push-subscription'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Invisible component that auto-subscribes admin users to push notifications on mount.
 * Mounted in AdminPageTemplate so it runs when any admin page loads.
 */
export function PushAutoSubscribe() {
  const { token } = useAuth()
  usePushSubscription(token ?? null)
  return null
}
