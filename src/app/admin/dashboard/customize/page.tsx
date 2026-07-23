'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

const STORAGE_KEY = 'dashboard-show-graphs'

export default function CustomizeDashboardPage() {
  const { t } = useLocale()
  const [showGraphs, setShowGraphs] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setShowGraphs(stored === 'true')
    } catch {
      // ignore
    }
  }, [])

  const handleShowGraphsChange = (checked: boolean) => {
    setShowGraphs(checked)
    try {
      localStorage.setItem(STORAGE_KEY, String(checked))
    } catch {
      // ignore
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.dashboard.customizeDashboard')}
      description={t('admin.dashboard.customizeDescription') || 'Toggle options for the dashboard view.'}
      showConstruction={false}
    >
      <div className="w-full flex flex-col items-center px-2 sm:px-0">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <Link href="/admin/dashboard" className="self-start">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back') || 'Back'} to {t('admin.dashboard.title')}
            </Button>
          </Link>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-base">{t('admin.dashboard.customizeDashboard')}</CardTitle>
              <CardDescription>
                {t('admin.dashboard.customizeDescription') || 'Toggle options for the dashboard view.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="show-graphs" className="text-sm font-medium cursor-pointer">
                    {t('admin.dashboard.showGraphs') || 'Show graphs'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.dashboard.showGraphsHint') || 'When on, overview and performance cards show charts. When off, only the numbers are shown.'}
                  </p>
                </div>
                {mounted && (
                  <div className="flex-shrink-0 sm:pl-4">
                    <Switch
                      id="show-graphs"
                      checked={showGraphs}
                      onCheckedChange={handleShowGraphsChange}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageTemplate>
  )
}
