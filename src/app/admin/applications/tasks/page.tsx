'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { useLocale } from '@/contexts/LocaleContext'

export default function TasksPage() {
  const { t } = useLocale()
  
  return (
    <AdminPageTemplate
      title={t('admin.sidebar.tasks')}
      description={t('admin.applications.tasksDescription') || "Advanced task management system for tracking application progress, deadlines, and team assignments."}
      showConstruction={true}
    />
  )
}
