'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PWA_INSTALLABLE_EVENT,
  PWA_INSTALLED_EVENT,
  detectPwaInstallPlatform,
  getDeferredInstallPrompt,
  isPwaInstalled,
  requiresManualPwaInstall,
  setDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa/install-prompt'

export function usePwaInstall() {
  const [installed, setInstalled] = useState(false)
  const [canNativePrompt, setCanNativePrompt] = useState(false)
  const platform = detectPwaInstallPlatform()
  const manualOnly = requiresManualPwaInstall()

  useEffect(() => {
    setInstalled(isPwaInstalled())
    setCanNativePrompt(!!getDeferredInstallPrompt())

    const onInstallable = () => setCanNativePrompt(!!getDeferredInstallPrompt())
    const onInstalled = () => {
      setInstalled(true)
      setCanNativePrompt(false)
    }

    window.addEventListener(PWA_INSTALLABLE_EVENT, onInstallable)
    window.addEventListener(PWA_INSTALLED_EVENT, onInstalled)
    return () => {
      window.removeEventListener(PWA_INSTALLABLE_EVENT, onInstallable)
      window.removeEventListener(PWA_INSTALLED_EVENT, onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const deferred = getDeferredInstallPrompt()
    if (!deferred) return 'unavailable'
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferredInstallPrompt(null)
    setCanNativePrompt(false)
    if (outcome === 'accepted') setInstalled(true)
    return outcome
  }, [])

  return { installed, canNativePrompt, manualOnly, platform, promptInstall }
}

/** Captures beforeinstallprompt and appinstalled events globally. */
export function PwaInstallCapture() {
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent)
      window.dispatchEvent(new Event(PWA_INSTALLABLE_EVENT))
    }
    const onInstalled = () => {
      setDeferredInstallPrompt(null)
      window.dispatchEvent(new Event(PWA_INSTALLED_EVENT))
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  return null
}
