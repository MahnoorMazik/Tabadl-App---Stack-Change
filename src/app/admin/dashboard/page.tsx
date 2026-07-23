'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { DynamicDashboard } from '@/components/DynamicDashboard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

const STORAGE_KEY = 'dashboard-show-graphs'

export default function AdminDashboard() {
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

  return (
    <AdminPageTemplate
      title={t('admin.dashboard.title')}
      description={t('admin.dashboard.description')}
      showConstruction={false}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Link href="/admin/dashboard/customize">
            <Button variant="outline" size="sm" className="min-w-[180px] gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {t('admin.dashboard.customizeDashboard')}
            </Button>
          </Link>
        </div>
        {mounted && <DynamicDashboard showGraphs={showGraphs} />}
      </div>
    </AdminPageTemplate>
  )
}