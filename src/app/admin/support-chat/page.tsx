'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { useLocale } from '@/contexts/LocaleContext'

export default function SupportChatPage() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.supportChat.title') || 'Support Chat System'}
      description={t('admin.supportChat.description') || 'Advanced customer support chat system with real-time messaging, ticket management, and team collaboration tools.'}
      showConstruction={true}
    />
  )
}
