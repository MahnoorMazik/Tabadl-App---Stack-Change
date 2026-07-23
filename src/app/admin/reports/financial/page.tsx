'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { DollarSign } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function FinancialReportsPage() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.reports.financial')}
      description={t('admin.reports.financialDescription')}
      icon={<DollarSign className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.reports.financial')}
        description={t('admin.reports.financialConstructionDesc')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}
