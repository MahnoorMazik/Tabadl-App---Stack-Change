'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Download } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export const PWA_INSTALL_REQUEST = 'pwa-install-request'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const pathname = usePathname()
  const { t } = useLocale()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  deferredPromptRef.current = deferredPrompt

  // Only show install prompt on dashboard (after login), not on login page
  const isDashboardPage = pathname === '/admin/dashboard'
  const isAdminPage = pathname?.startsWith('/admin') ?? false

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }
    if ((window.navigator as any).standalone === true) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Only auto-show prompt when on dashboard; otherwise store for later
      if (pathname === '/admin/dashboard') setShowPrompt(true)
    }

    const handleInstallRequest = () => {
      sessionStorage.removeItem('pwa-prompt-dismissed')
      if (deferredPromptRef.current) {
        setShowPrompt(true)
      } else {
        setShowFallback(true)
        setShowPrompt(true)
      }
    }

    if (isAdminPage) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
    window.addEventListener(PWA_INSTALL_REQUEST, handleInstallRequest)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      setShowFallback(false)
    })

    return () => {
      if (isAdminPage) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
      window.removeEventListener(PWA_INSTALL_REQUEST, handleInstallRequest)
    }
  }, [isAdminPage, pathname])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setShowPrompt(false)
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Only show prompt on dashboard (after user has logged in), not on login page
  if (!isDashboardPage) return null
  if (isInstalled || !showPrompt) return null
  if (!deferredPrompt && !showFallback) return null
  if (typeof window !== 'undefined' && sessionStorage.getItem('pwa-prompt-dismissed') === 'true') {
    return null
  }

  return (
    <Card className="fixed bottom-4 left-4 md:left-6 z-[99] w-80 shadow-lg border-2 border-emerald-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-600" />
            {t('pwa.installTitle') || 'Install App'}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription>
          {showFallback && !deferredPrompt
            ? (t('pwa.installFallback') || 'Use your browser menu (⋮ or ⋯) and choose "Install app" or "Add to Home Screen". The app will open on the admin dashboard.')
            : (t('pwa.installDescription') || 'Install TK CRM for quick access and offline support.')}
        </CardDescription>
        <div className="flex gap-2">
          {deferredPrompt ? (
            <>
              <Button
                onClick={handleInstallClick}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {t('pwa.installButton') || 'Install'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
              >
                {t('common.later') || 'Later'}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
            >
              {t('common.gotIt') || 'Got it'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
