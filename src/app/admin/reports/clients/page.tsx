'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Users } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.reports.clients')}
      description={t('admin.reports.clientsDescription')}
      icon={<Users className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.reports.clients')}
        description={t('admin.reports.clientsConstructionDesc')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

