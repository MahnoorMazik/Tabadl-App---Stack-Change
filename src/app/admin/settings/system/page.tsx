'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Shield } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.sidebar.systemConfiguration')}
      description={t('admin.settings.systemDescription') || 'Advanced system settings'}
      icon={<Shield className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.sidebar.systemConfiguration')}
        description={t('admin.settings.systemConstructionDesc') || "We're preparing advanced configuration options."}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}
