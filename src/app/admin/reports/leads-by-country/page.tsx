'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Download, 
  Filter,
  Globe,
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react'
import axios from 'axios'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface CountryStat {
  country: string
  count: number
  percentage: number
  statusBreakdown?: {
    [key: string]: number
  }
}

interface AnalyticsData {
  countries: CountryStat[]
  total: number
  dateRange: {
    startDate: string | null
    endDate: string | null
  }
  summary: {
    totalCountries: number
    countriesWithLeads: number
    topCountry: string | null
  }
}

export default function LeadsByCountryPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | '365' | 'all'>('30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [limit, setLimit] = useState<string>('all')

  const fetchData = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}

    setLoading(true)
    try {
      const params = new URLSearchParams()

      // Calculate date range
      if (useCustomRange && customStartDate && customEndDate) {
        params.append('startDate', customStartDate)
        params.append('endDate', customEndDate)
      } else if (!useCustomRange && dateRange !== 'all') {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(endDate.getDate() - parseInt(dateRange))
        params.append('startDate', startDate.toISOString().split('T')[0])
        params.append('endDate', endDate.toISOString().split('T')[0])
      }

      // Add status filter
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      // Add limit
      if (limit && limit !== 'all') {
        params.append('limit', limit)
      }

      const response = await axios.get(`/api/analytics/leads/by-country?${params.toString()}`, {
        headers
      })

      if (response.data?.success && response.data?.data) {
        setData(response.data.data)
      } else {
        toast({
          title: t('common.error'),
          description: t('admin.reports.leadsByCountry.fetchError'),
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.reports.leadsByCountry.fetchError'),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [token, dateRange, customStartDate, customEndDate, useCustomRange, statusFilter, limit, toast, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = () => {
    if (!data) return

    // Create CSV content (use translated headers)
    const headers = [t('admin.reports.leadsByCountry.country'), t('admin.reports.leadsByCountry.count'), t('admin.reports.leadsByCountry.percentage'), t('admin.reports.leadsByCountry.statusBreakdown')]
    const rows = data.countries.map(country => {
      const statusBreakdown = country.statusBreakdown
        ? Object.entries(country.statusBreakdown)
            .map(([status, count]) => `${status}: ${count}`)
            .join('; ')
        : 'N/A'
      return [
        country.country,
        country.count.toString(),
        `${country.percentage}%`,
        statusBreakdown
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `leads-by-country-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: t('common.success'),
      description: t('admin.reports.leadsByCountry.exportSuccess')
    })
  }

  const getMaxCount = () => {
    if (!data || data.countries.length === 0) return 1
    return Math.max(...data.countries.map(c => c.count))
  }

  return (
    <AdminPageTemplate
      title={t('admin.reports.leadsByCountry.title')}
      description={t('admin.reports.leadsByCountry.description')}
      icon={<Globe className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('admin.reports.leadsByCountry.filters')}
            </CardTitle>
            <CardDescription>
              {t('admin.reports.leadsByCountry.filtersDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Range Selector */}
              <div className="space-y-2">
                <Label>{t('admin.reports.dateRange')}</Label>
                <Select
                  value={useCustomRange ? 'custom' : dateRange}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setUseCustomRange(true)
                    } else {
                      setUseCustomRange(false)
                      setDateRange(value as '7' | '30' | '90' | '365' | 'all')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{t('admin.reports.leadsByCountry.last7Days')}</SelectItem>
                    <SelectItem value="30">{t('admin.reports.leadsByCountry.last30Days')}</SelectItem>
                    <SelectItem value="90">{t('admin.reports.leadsByCountry.last90Days')}</SelectItem>
                    <SelectItem value="365">{t('admin.reports.leadsByCountry.lastYear')}</SelectItem>
                    <SelectItem value="all">{t('admin.reports.leadsByCountry.allTime')}</SelectItem>
                    <SelectItem value="custom">{t('admin.reports.leadsByCountry.customRange')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {useCustomRange && (
                <>
                  <div className="space-y-2">
                    <Label>{t('admin.reports.leadsByCountry.startDate')}</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin.reports.leadsByCountry.endDate')}</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>{t('admin.reports.leadsByCountry.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.reports.leadsByCountry.allStatuses')}</SelectItem>
                    <SelectItem value="NEW">{t('admin.reports.leadsByCountry.statusNew')}</SelectItem>
                    <SelectItem value="CONTACTED">{t('admin.reports.leadsByCountry.statusContacted')}</SelectItem>
                    <SelectItem value="QUALIFIED">{t('admin.reports.leadsByCountry.statusQualified')}</SelectItem>
                    <SelectItem value="PROPOSAL">{t('admin.reports.leadsByCountry.statusProposal')}</SelectItem>
                    <SelectItem value="NEGOTIATION">{t('admin.reports.leadsByCountry.statusNegotiation')}</SelectItem>
                    <SelectItem value="CLOSED_WON">{t('admin.reports.leadsByCountry.statusClosedWon')}</SelectItem>
                    <SelectItem value="CLOSED_LOST">{t('admin.reports.leadsByCountry.statusClosedLost')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Limit */}
              <div className="space-y-2">
                <Label>{t('admin.reports.leadsByCountry.topCountries')}</Label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.reports.leadsByCountry.allCountries')}</SelectItem>
                    <SelectItem value="10">{t('admin.reports.leadsByCountry.top10')}</SelectItem>
                    <SelectItem value="20">{t('admin.reports.leadsByCountry.top20')}</SelectItem>
                    <SelectItem value="50">{t('admin.reports.leadsByCountry.top50')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        ) : data && data.countries.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatNumber(data.total)}</div>
                  <p className="text-xs text-gray-600">{t('admin.reports.leadsByCountry.totalLeads')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatNumber(data.summary.totalCountries)}
                  </div>
                  <p className="text-xs text-gray-600">{t('admin.reports.leadsByCountry.totalCountries')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(data.summary.countriesWithLeads)}
                  </div>
                  <p className="text-xs text-gray-600">{t('admin.reports.leadsByCountry.countriesWithLeads')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-600 flex items-center gap-1">
                    <TrendingUp className="h-5 w-5" />
                    {data.summary.topCountry || t('common.n/a') || 'N/A'}
                  </div>
                  <p className="text-xs text-gray-600">{t('admin.reports.leadsByCountry.topCountry')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart and Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t('admin.reports.leadsByCountry.leadDistributionByCountry')}
                  </CardTitle>
                  <CardDescription>
                    {t('admin.reports.leadsByCountry.leadDistributionDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.countries.slice(0, 10).map((country, index) => {
                      const maxCount = getMaxCount()
                      const width = (country.count / maxCount) * 100
                      return (
                        <div key={country.country} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{country.country}</span>
                            <span className="text-gray-600">{country.count} ({country.percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-6 flex items-center justify-end pr-2 text-white text-xs font-medium transition-all"
                              style={{ width: `${width}%` }}
                            >
                              {width > 10 ? `${country.count}` : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Countries Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('admin.reports.leadsByCountry.topCountries')}</CardTitle>
                    <CardDescription>
                      {t('admin.reports.leadsByCountry.topCountriesDesc')}
                    </CardDescription>
                  </div>
                  <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin.reports.exportCSV')}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.country')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.count')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.percentage')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.countries.map((country, index) => (
                          <tr key={country.country} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{index + 1}</Badge>
                                <span className="font-medium">{country.country}</span>
                              </div>
                            </td>
                            <td className="p-2 text-right font-semibold">{formatNumber(country.count)}</td>
                            <td className="p-2 text-right text-gray-600">{formatNumber(country.percentage)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Status Breakdown */}
            {statusFilter === 'all' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.reports.leadsByCountry.statusBreakdownByCountry')}</CardTitle>
                  <CardDescription>
                    {t('admin.reports.leadsByCountry.statusBreakdownDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.country')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.statusNew')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.statusContacted')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.statusQualified')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.statusClosedWon')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.statusClosedLost')}</th>
                          <th className="text-right p-2 font-medium text-sm">{t('admin.reports.leadsByCountry.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.countries.slice(0, 20).map((country) => {
                          const breakdown = country.statusBreakdown || {}
                          return (
                            <tr key={country.country} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium">{country.country}</td>
                              <td className="p-2 text-right">{breakdown.NEW || 0}</td>
                              <td className="p-2 text-right">{breakdown.CONTACTED || 0}</td>
                              <td className="p-2 text-right">{breakdown.QUALIFIED || 0}</td>
                              <td className="p-2 text-right text-green-600 font-semibold">
                                {breakdown.CLOSED_WON || 0}
                              </td>
                              <td className="p-2 text-right text-red-600 font-semibold">
                                {breakdown.CLOSED_LOST || 0}
                              </td>
                              <td className="p-2 text-right font-bold">{country.count}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>{t('admin.reports.leadsByCountry.noLeadsFound')}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPageTemplate>
  )
}

