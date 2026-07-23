'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export default function RejectedApplicationsPage() {
  const { t } = useLocale()
  return (
    <AdminPageTemplate
      title={t('admin.applications.rejected') || 'Rejected Applications'}
      description={t('admin.applications.rejectedDescription') || 'Applications that were rejected'}
      icon={<AlertCircle className="h-6 w-6" />}
      showConstruction={false}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.applications.rejected') || 'Rejected Applications'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            {t('admin.applications.noRejected') || 'No rejected applications. Rejection workflow can be implemented as needed.'}
          </div>
        </CardContent>
      </Card>
    </AdminPageTemplate>
  )
}
