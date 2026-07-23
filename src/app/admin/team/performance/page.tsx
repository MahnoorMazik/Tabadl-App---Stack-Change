'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BarChart3 } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function TeamPerformancePage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerformance()
  }, [])

  const fetchPerformance = async () => {
    try {
      const response = await axios.get('/api/analytics/performance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPerformanceData(response.data.performanceData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.team.performance') || 'Team Performance'}
      description={t('admin.team.performanceDescription') || 'View team performance metrics'}
      icon={<BarChart3 className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.team.performance') || 'Team Performance'}
        description={t('admin.team.performanceUnderConstruction') || 'Team performance analytics are under construction.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="hidden">
        {loading ? (
          <div className="text-center py-8">{t('common.loading')}</div>
        ) : performanceData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('admin.team.noDataAvailable') || 'No data available'}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {performanceData.map((data) => (
              <Card key={data.staff.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{data.staff.name}</span>
                    <span className="text-sm font-normal text-gray-600">{data.staff.staffType}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t('admin.team.applicationsManaged') || 'Applications Managed'}</span>
                      <span className="font-medium">{formatNumber(data.metrics.applicationsManaged)}</span>
                    </div>
                    <Progress value={parseFloat(data.metrics.applicationCompletionRate)} />
                    <p className="text-xs text-gray-600 mt-1">{formatNumber(data.metrics.applicationCompletionRate)}% {t('admin.team.completionRate') || 'completion rate'}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t('admin.team.tasksCompleted') || 'Tasks Completed'}</span>
                      <span className="font-medium">{formatNumber(data.metrics.completedTasks)} / {formatNumber(data.metrics.tasksAssigned)}</span>
                    </div>
                    <Progress value={parseFloat(data.metrics.taskCompletionRate)} />
                    <p className="text-xs text-gray-600 mt-1">{formatNumber(data.metrics.taskCompletionRate)}% {t('admin.team.completionRate') || 'completion rate'}</p>
                  </div>
                  {data.metrics.leadsManaged > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t('admin.team.leadConversion') || 'Lead Conversion'}</span>
                        <span className="font-medium">{formatNumber(data.metrics.convertedLeads)} / {formatNumber(data.metrics.leadsManaged)}</span>
                      </div>
                      <Progress value={parseFloat(data.metrics.leadConversionRate)} />
                      <p className="text-xs text-gray-600 mt-1">{formatNumber(data.metrics.leadConversionRate)}% {t('admin.team.conversionRate') || 'conversion rate'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminPageTemplate>
  )
}
