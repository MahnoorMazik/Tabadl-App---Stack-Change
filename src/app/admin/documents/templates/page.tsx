'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { FileText } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.documents.templates') || 'Document Templates'}
      description={t('admin.documents.templatesDescription') || 'Manage document templates'}
      icon={<FileText className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.documents.templates') || 'Document Templates'}
        description={t('admin.documents.templatesUnderConstruction') || 'Template management tools are under development.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

