'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Archive } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.documents.archived') || 'Archived Documents'}
      description={t('admin.documents.archivedDescription') || 'View archived documents'}
      icon={<Archive className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.documents.archived') || 'Archived Documents'}
        description={t('admin.documents.archivedUnderConstruction') || 'Archive browsing will be available soon.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

