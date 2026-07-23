'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Settings } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export default function AdminSettingsPage() {
  const { t } = useLocale()

  return (
    <AdminPageTemplate 
      title={t('admin.settings.general')} 
      description={t('admin.settings.generalDescription') || "Configure system preferences"}
      icon={<Settings className="h-6 w-6" />}
      showConstruction={true}
    />
  )
}

