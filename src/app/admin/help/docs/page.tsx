'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { FileText } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.help.docs')}
      description={t('admin.help.docsDescription')}
      icon={<FileText className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.help.docsConstructionTitle')}
        description={t('admin.help.docsConstructionDesc')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

