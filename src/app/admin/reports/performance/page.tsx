'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { BarChart3 } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function PerformanceReportsPage() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.reports.performance')}
      description={t('admin.reports.performanceDescription')}
      icon={<BarChart3 className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.reports.performance')}
        description={t('admin.reports.performanceConstructionDesc')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}
