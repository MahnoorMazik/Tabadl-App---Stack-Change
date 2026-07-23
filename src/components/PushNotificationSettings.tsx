'use client'

import { Label } from '@/components/ui/label'
import { Bell, CheckCircle, Smartphone } from 'lucide-react'
import { usePushSubscription } from '@/hooks/use-push-subscription'
import { useAuth } from '@/contexts/AuthContext'

function isMobile() {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function PushNotificationSettings() {
  const { token } = useAuth()
  const { status, isSupported, isSubscribed, error } = usePushSubscription(token ?? null)

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label className="text-base font-medium">Push Notifications</Label>
          <p className="text-sm text-muted-foreground">Not supported in this browser</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-emerald-600" />
          <div>
            <Label className="text-base font-medium">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? 'Receiving browser notifications'
                : status === 'denied'
                  ? 'Blocked—enable in browser settings'
                  : 'Enabled by default'}
            </p>
          </div>
          {isSubscribed && <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
        </div>
      </div>
      {isMobile() && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Smartphone className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">For reliable notifications on Android</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
              <li>Add this site to Home Screen (Chrome menu → Install app)</li>
              <li>Ensure notifications are allowed in Chrome and device Settings</li>
              <li>Disable battery saver/optimization for Chrome if needed</li>
            </ul>
          </div>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
