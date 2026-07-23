'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { HelpCircle } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.help.title')}
      description={t('admin.help.description')}
      icon={<HelpCircle className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.help.title')}
        description={t('admin.help.constructionResources')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

