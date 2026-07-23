'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { FileText } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.reports.applications')}
      description={t('admin.reports.applicationsDescription')}
      icon={<FileText className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.reports.applications')}
        description={t('admin.reports.applicationsConstructionDesc')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

