'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, DollarSign as Money } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function RevenuePage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/analytics/revenue', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format: { success: true, data: { analytics: {...} } }
      const analytics = response.data?.data?.analytics || response.data?.analytics
      setAnalytics(analytics)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminPageTemplate title={t('admin.financial.revenue')} description={t('admin.financial.revenueDescription')} icon={<DollarSign className="h-6 w-6" />} showConstruction={false}>
        <PageUnderConstruction
          title={t('admin.financial.revenue')}
          description={t('admin.financial.revenueUnderConstruction')}
          backHref="/admin/dashboard"
          backLabel={t('common.backToDashboard')}
        />
        <div className="text-center py-8 hidden">{t('common.loading')}</div>
      </AdminPageTemplate>
    )
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

  return (
    <AdminPageTemplate
      title={t('admin.financial.revenue')}
      description={t('admin.financial.revenueDescription')}
      icon={<DollarSign className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.financial.revenue')}
        description={t('admin.financial.revenueUnderConstruction')}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="space-y-6 hidden">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                SAR {formatNumber(analytics?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {formatNumber(analytics?.totalRevenueCount || 0)} {t('admin.financial.paidInvoices')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.pendingRevenue')}</CardTitle>
              <Money className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                SAR {formatNumber(analytics?.pendingRevenue || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {formatNumber(analytics?.pendingRevenueCount || 0)} {t('admin.financial.unpaidInvoices')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.totalExpenses')}</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                SAR {formatNumber(analytics?.totalExpenses || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {formatNumber(analytics?.totalExpensesCount || 0)} {t('admin.financial.expensesCount')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.financial.netProfit')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics?.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                SAR {formatNumber(analytics?.netProfit || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t('admin.financial.revenueMinusExpenses')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Revenue by Month */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.financial.revenueByMonth')}</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.revenueByMonth && analytics.revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip formatter={(value: any) => formatNumber(value)} />
                    <Legend />
                    <Bar dataKey="total" fill="#10b981" name={t('admin.financial.revenue') + ' (SAR)'} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  {t('admin.financial.noRevenueData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.financial.expensesByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.expensesByCategory && analytics.expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.expensesByCategory}
                      dataKey="_sum.amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.category}: SAR ${formatNumber(entry._sum.amount)}`}
                    >
                      {analytics.expensesByCategory.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  {t('admin.financial.noExpenseData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expense Breakdown Table */}
        {analytics?.expensesByCategory && analytics.expensesByCategory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.financial.expenseBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.expensesByCategory.map((category: any, index: number) => (
                  <div key={category.category} className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{category.category}</span>
                      <Badge variant="outline">{formatNumber(category._count)} {t('admin.financial.expensesCount')}</Badge>
                    </div>
                    <span className="font-semibold">SAR {formatNumber(category._sum.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPageTemplate>
  )
}
