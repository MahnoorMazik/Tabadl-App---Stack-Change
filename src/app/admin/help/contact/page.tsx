'use client'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Phone } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function Page() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.help.contact')}
      description={t('admin.help.contactDescription')}
      icon={<Phone className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.help.contactConstructionTitle')}
        description={t('admin.help.contactConstructionDesc')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
    </AdminPageTemplate>
  )
}

