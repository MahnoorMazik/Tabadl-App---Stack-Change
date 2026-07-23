'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Eye } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { useLocale } from '@/contexts/LocaleContext'

export default function PendingApplicationsPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingApplications()
  }, [])

  const fetchPendingApplications = async () => {
    try {
      const response = await axios.get('/api/applications?status=ONBOARDING', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format
      const applications = response.data.data?.applications || response.data.applications || []
      setApplications(applications)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.applications.pending') || 'Pending Applications'}
      description={t('admin.applications.pendingDescription') || 'Applications awaiting review'}
      icon={<Clock className="h-6 w-6" />}
      showConstruction={false}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.applications.pending') || 'Pending Applications'} ({formatNumber(applications.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('admin.applications.noPending') || 'No pending applications'}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.applications.applicationNumber') || 'Application Number'}</TableHead>
                  <TableHead>{t('admin.clients.client')}</TableHead>
                  <TableHead>{t('admin.applications.assignedTo') || 'Assigned To'}</TableHead>
                  <TableHead>{t('admin.applications.startDate') || 'Start Date'}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">{application.applicationNumber}</TableCell>
                    <TableCell>{application.user?.name}</TableCell>
                    <TableCell>{application.assignedTo?.name || t('admin.applications.unassigned') || 'Unassigned'}</TableCell>
                    <TableCell>{format(new Date(application.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        {t('common.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminPageTemplate>
  )
}
