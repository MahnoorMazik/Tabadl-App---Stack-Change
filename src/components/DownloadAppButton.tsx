'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

import { PWA_INSTALL_REQUEST } from '@/components/PWAInstallPrompt'

export function DownloadAppButton() {
  const { t } = useLocale()
  const [isInstalled, setIsInstalled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }
    if ((window.navigator as any).standalone === true) {
      setIsInstalled(true)
    }
  }, [])

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_REQUEST))
  }

  if (!mounted || isInstalled) return null

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="lg"
      className="fixed bottom-36 right-4 md:bottom-[152px] md:right-6 z-[100] h-14 w-14 rounded-full p-0 gap-0 shadow-lg bg-white dark:bg-background border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-700 ring-2 ring-white/20 dark:ring-black/20 [&_svg]:size-10"
      aria-label={t('nav.downloadApp') || 'Download App'}
    >
      <Download className="h-10 w-10 shrink-0" />
    </Button>
  )
}

