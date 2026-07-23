'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Archive } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.sidebar.backupRestore')}
      description={t('admin.settings.backupDescription') || 'Database backup and restore'}
      icon={<Archive className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.sidebar.backupRestore')}
        description={t('admin.settings.backupConstructionDesc') || 'Automated backup tools are in progress.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

