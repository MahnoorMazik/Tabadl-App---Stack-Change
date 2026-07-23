'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Folder } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.clients.categories') || 'Client Categories'}
      description={t('admin.clients.categoriesDescription') || 'Manage client categorization'}
      icon={<Folder className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.clients.categories') || 'Client Categories'}
        description={t('admin.clients.categoriesUnderConstruction') || 'Category management is on the roadmap.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

