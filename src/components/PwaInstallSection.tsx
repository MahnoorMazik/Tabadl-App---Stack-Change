'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, CheckCircle2, Smartphone } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { useToast } from '@/hooks/use-toast'
import { usePwaInstall } from '@/hooks/usePwaInstall'

export function PwaInstallSection() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { installed, canNativePrompt, manualOnly, platform, promptInstall } = usePwaInstall()
  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    if (installed) return

    if (canNativePrompt) {
      setInstalling(true)
      try {
        const outcome = await promptInstall()
        if (outcome === 'accepted') {
          toast({
            title: t('pwa.installedTitle') || 'App installed',
            description:
              t('pwa.installedDescription') ||
              'TK CRM is now available from your home screen or app launcher.',
          })
        } else if (outcome === 'dismissed') {
          toast({
            title: t('pwa.installDismissed') || 'Install cancelled',
            description: t('pwa.installDismissedDesc') || 'You can install the app anytime from this page.',
          })
        }
      } finally {
        setInstalling(false)
      }
      return
    }

    toast({
      title: t('pwa.installTitle') || 'Install App',
      description:
        platform === 'ios'
          ? t('pwa.installIosHint') ||
            'On iPhone/iPad: tap Share, then “Add to Home Screen”.'
          : t('pwa.installFallback') ||
            'Use your browser menu (⋮ or ⋯) and choose “Install app” or “Add to Home Screen”.',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-emerald-600" />
          {t('pwa.installTitle') || 'Install App'}
        </CardTitle>
        <CardDescription>
          {t('pwa.installDescription') ||
            'Install TK CRM for quick access and offline support.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {installed ? (
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {t('pwa.alreadyInstalled') || 'Installed'}
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              <Smartphone className="h-3.5 w-3.5 mr-1" />
              {t('pwa.notInstalled') || 'Not installed'}
            </Badge>
          )}
        </div>

        {installed ? (
          <p className="text-sm text-muted-foreground">
            {t('pwa.alreadyInstalledDesc') ||
              'This app is already installed on this device.'}
          </p>
        ) : (
          <>
            {(manualOnly || !canNativePrompt) && (
              <p className="text-sm text-muted-foreground">
                {platform === 'ios'
                  ? t('pwa.installIosHint') ||
                    'On iPhone/iPad: tap Share, then “Add to Home Screen”.'
                  : t('pwa.installFallback') ||
                    'If the install button does not open a prompt, use your browser menu (⋮ or ⋯) and choose “Install app”.'}
              </p>
            )}
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => void handleInstall()}
              disabled={installing}
            >
              <Download className="h-4 w-4 mr-2" />
              {installing
                ? t('pwa.installing') || 'Installing…'
                : t('pwa.installButton') || 'Install'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
