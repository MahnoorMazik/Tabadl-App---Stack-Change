'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { PermissionChecker, Module, Action } from '@/lib/rbac'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Users, Building, FileText, TrendingUp, DollarSign, Bell,
  ArrowRight, Users as UsersIcon, FileText as FileTextIcon,
  DollarSign as DollarSignIcon, BarChart3, Clock, CheckCircle,
  AlertCircle, Eye, Plus, MessageSquare, HelpCircle, Settings,
  Shield, UserPlus, FolderOpen, Archive, Mail, Phone,
  Receipt, CreditCard, TrendingDown
} from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { APP_VERSION_LABEL } from '@/lib/app-version'

interface DashboardWidget {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  permission: string
  data?: any
  priority: number
}

interface DynamicDashboardProps {
  className?: string
  showGraphs?: boolean
}

// Widget definitions with permissions
const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: 'clients-overview',
    title: 'Client Overview',
    description: 'Manage your clients and leads',
    icon: Users,
    href: '/admin/clients',
    permission: `${Module.CLIENTS}.${Action.VIEW}`,
    priority: 1
  },
  {
    id: 'leads-overview',
    title: 'Lead Management',
    description: 'Track and manage potential clients',
    icon: UserPlus,
    href: '/admin/leads',
    permission: `${Module.LEADS}.${Action.VIEW}`,
    priority: 2
  },
  {
    id: 'applications-overview',
    title: 'Applications',
    description: 'Track application progress',
    icon: FileText,
    href: '/admin/applications',
    permission: `${Module.APPLICATIONS}.${Action.VIEW}`,
    priority: 3
  },
  {
    id: 'financial-overview',
    title: 'Financial Overview',
    description: 'Revenue and financial metrics',
    icon: DollarSign,
    href: '/admin/financial/revenue',
    permission: `${Module.FINANCIAL}.${Action.VIEW}`,
    priority: 4
  },
  {
    id: 'invoices-overview',
    title: 'Invoices',
    description: 'Invoice management and tracking',
    icon: Receipt,
    href: '/admin/financial/invoices',
    permission: `${Module.INVOICES}.${Action.VIEW}`,
    priority: 5
  },
  {
    id: 'payments-overview',
    title: 'Payments',
    description: 'Payment processing and tracking',
    icon: CreditCard,
    href: '/admin/financial/payments',
    permission: `${Module.PAYMENTS}.${Action.VIEW}`,
    priority: 6
  },
  {
    id: 'expenses-overview',
    title: 'Expenses',
    description: 'Expense tracking and approval',
    icon: TrendingDown,
    href: '/admin/financial/expenses',
    permission: `${Module.EXPENSES}.${Action.VIEW}`,
    priority: 7
  },
  {
    id: 'documents-overview',
    title: 'Documents',
    description: 'Document management',
    icon: FileText,
    href: '/admin/documents',
    permission: `${Module.DOCUMENTS}.${Action.VIEW}`,
    priority: 8
  },
  {
    id: 'team-overview',
    title: 'Team Management',
    description: 'Manage team members and roles',
    icon: Users,
    href: '/admin/team',
    permission: `${Module.TEAM}.${Action.VIEW}`,
    priority: 9
  },
  {
    id: 'messages-overview',
    title: 'Messages',
    description: 'Internal and client communications',
    icon: MessageSquare,
    href: '/admin/messages/inbox',
    permission: `${Module.MESSAGES}.${Action.VIEW}`,
    priority: 10
  },
  {
    id: 'reports-overview',
    title: 'Reports',
    description: 'Generate and view reports',
    icon: BarChart3,
    href: '/admin/reports/clients',
    permission: `${Module.REPORTS}.${Action.VIEW}`,
    priority: 11
  },
  {
    id: 'settings-overview',
    title: 'Settings',
    description: 'System configuration',
    icon: Settings,
    href: '/admin/settings/general',
    permission: `${Module.SETTINGS}.${Action.VIEW}`,
    priority: 12
  }
]

export function DynamicDashboard({ className, showGraphs = false }: DynamicDashboardProps) {
  const { user, loading: authLoading, token } = useAuth()
  const { t, formatNumber } = useLocale()
  // Initialize with default analytics structure instead of empty object
  const [analytics, setAnalytics] = useState<any>({
    totalLeads: 0,
    totalClients: 0,
    totalApplications: 0,
    totalTasks: 0,
    totalInvoices: 0,
    newClients: 0,
    newLeads: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    conversionRate: 0,
    clientGrowthRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null)
  const [accessibleWidgets, setAccessibleWidgets] = useState<DashboardWidget[]>([])
  const initializedRef = useRef(false)
  const lastPermissionsRef = useRef<string>('')

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      // Note: NextAuth uses cookies for authentication, so token may be null
      // The API routes use withAuth middleware which checks session cookies
      // We still try to get token from localStorage as fallback for compatibility
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      
      // Always make the request - NextAuth cookies will handle authentication
      const response = await axios.get('/api/analytics/dashboard', {
        headers,
        withCredentials: true // Ensure cookies are sent
      })
      
      // Handle structured response format: { success: true, data: { analytics: {...} } }
      const analytics = response.data?.data?.analytics || response.data?.analytics || response.data
      
      // Always set analytics - even if empty, the API should return default values
      if (analytics && typeof analytics === 'object') {
        setAnalytics(analytics)
      } else {
        // Fallback: create default analytics structure
        setAnalytics({
          totalLeads: 0,
          totalClients: 0,
          totalApplications: 0,
          totalTasks: 0,
          totalInvoices: 0,
          newClients: 0,
          newLeads: 0,
          totalRevenue: 0,
          pendingRevenue: 0,
          conversionRate: 0,
          clientGrowthRate: 0
        })
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      // Set default analytics on error so dashboard still renders with zeros
      setAnalytics({
        totalLeads: 0,
        totalClients: 0,
        totalApplications: 0,
        totalTasks: 0,
        totalInvoices: 0,
        newClients: 0,
        newLeads: 0,
        totalRevenue: 0,
        pendingRevenue: 0,
        conversionRate: 0,
        clientGrowthRate: 0
      })
    } finally {
      setLoading(false)
    }
  }, [token])

  // Initialize permission checker and fetch data
  useEffect(() => {
    // Don't initialize if auth is still loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      return
    }
    
    // Removed excessive logging to reduce console noise
    
    if (user && user.role === 'STAFF') {
      // Check if permissions are available (they might be loading)
      const permissions = user.permissions || []
      const permissionsKey = JSON.stringify(permissions)
      
      // Check if permissions have changed or we need to initialize
      const permissionsChanged = lastPermissionsRef.current !== permissionsKey
      const needsInitialization = !initializedRef.current || permissionsChanged
      
      if (needsInitialization && Array.isArray(permissions)) {
        initializedRef.current = true
        lastPermissionsRef.current = permissionsKey
        
        const checker = new PermissionChecker(permissions as any, user.role, user.staffType || 'ADMIN')
        setPermissionChecker(checker)
        
        // Filter widgets based on permissions
        const widgets = DASHBOARD_WIDGETS
          .filter(widget => {
            const hasPermission = checker.hasPermission(widget.permission as any)
            return hasPermission
          })
          .sort((a, b) => a.priority - b.priority)
        
        setAccessibleWidgets(widgets)
        
        // Fetch dashboard data (call directly, not from dependency)
        fetchDashboardData()
      }
    } else if (!user || user.role !== 'STAFF') {
      // Reset if user is not staff
      if (initializedRef.current) {
        initializedRef.current = false
        lastPermissionsRef.current = ''
        setPermissionChecker(null)
        setAccessibleWidgets([])
        // Reset to default analytics structure instead of empty object
        setAnalytics({
          totalLeads: 0,
          totalClients: 0,
          totalApplications: 0,
          totalTasks: 0,
          totalInvoices: 0,
          newClients: 0,
          newLeads: 0,
          totalRevenue: 0,
          pendingRevenue: 0,
          conversionRate: 0,
          clientGrowthRate: 0
        })
      }
    }
  }, [user, user?.permissions, authLoading]) // Removed fetchDashboardData to prevent infinite loops

  // Get widget data based on permissions
  const getWidgetData = (widget: DashboardWidget) => {
    if (!analytics) return null

    switch (widget.id) {
      case 'clients-overview':
        return {
          total: analytics.totalClients || 0,
          new: analytics.newClients || 0,
          active: analytics.activeClients || 0
        }
      case 'applications-overview':
        return {
          total: analytics.totalApplications || 0,
          pending: analytics.pendingApplications || 0,
          approved: analytics.approvedApplications || 0
        }
      case 'financial-overview':
        return {
          revenue: analytics.totalRevenue || 0,
          pending: analytics.pendingRevenue || 0,
          expenses: analytics.totalExpenses || 0
        }
      case 'documents-overview':
        return {
          total: analytics.totalDocuments || 0,
          pending: analytics.pendingDocuments || 0,
          approved: analytics.approvedDocuments || 0
        }
      default:
        return null
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || user.role !== 'STAFF') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Check if analytics is empty or invalid
  // Analytics should always have values (even if 0), so we only show unavailable if it's truly empty
  const isEmpty = !analytics || (typeof analytics === 'object' && Object.keys(analytics).length === 0)

  return (
    <div className="p-6 space-y-8">
      {/* Only show unavailable message if analytics is truly empty (not just zeros) */}
      {isEmpty && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 py-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3 text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium">
                {t('admin.dashboard.analyticsUnavailable')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission-based Quick Stats */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">{t('admin.dashboard.overview')}</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {permissionChecker?.canAccessModule(Module.CLIENTS) && (
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-foreground">{t('admin.dashboard.cards.totalClients')}</CardTitle>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-foreground mb-1">{formatNumber(analytics.totalClients || 0)}</div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3">
                  +{formatNumber(analytics.newClients || 0)} {t('admin.dashboard.newThisMonth')}
                </p>
                {showGraphs && analytics?.chartData?.length > 0 && (
                  <div className="h-36 w-full rounded-md bg-blue-50/50 dark:bg-blue-950/20 px-1 pb-0 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="clientFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#94a3b8" strokeOpacity={0.3} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                        <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 10, fill: 'currentColor' }} width={32} className="text-muted-foreground" />
                        <Tooltip formatter={(v: number) => [formatNumber(v), t('admin.dashboard.cards.totalClients')]} labelFormatter={(label) => label} contentStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="clients" stroke="#3b82f6" strokeWidth={2} fill="url(#clientFill)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {permissionChecker?.canAccessModule(Module.LEADS) && (
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-foreground">{t('admin.dashboard.cards.totalLeads')}</CardTitle>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-foreground mb-1">{formatNumber(analytics.totalLeads || 0)}</div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-3">
                  +{formatNumber(analytics.newLeads || 0)} {t('admin.dashboard.newThisMonth')}
                </p>
                {showGraphs && analytics?.chartData?.length > 0 && (
                  <div className="h-36 w-full rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 px-1 pb-0 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#94a3b8" strokeOpacity={0.3} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                        <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 10, fill: 'currentColor' }} width={32} className="text-muted-foreground" />
                        <Tooltip formatter={(v: number) => [formatNumber(v), t('admin.dashboard.cards.totalLeads')]} labelFormatter={(label) => label} contentStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} fill="url(#leadsFill)" dot={{ r: 4, fill: '#10b981', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Performance Metrics - Permission-based */}
      <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">{t('admin.dashboard.performanceMetrics')}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {permissionChecker?.canAccessModule(Module.LEADS) && permissionChecker?.canAccessModule(Module.CLIENTS) && (
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-card dark:to-card border-blue-200 dark:border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-foreground">{t('admin.dashboard.conversionRate')}</CardTitle>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{formatNumber(analytics.conversionRate || 0)}%</div>
                <p className="text-sm text-gray-600 dark:text-muted-foreground font-medium mb-3">
                  {t('admin.dashboard.leadsToClientsConversion')}
                </p>
                {showGraphs && analytics?.chartData?.length > 0 && (() => {
                  const conversionData = analytics.chartData.map((d: { month: string; clients: number; leads?: number }) => ({
                    ...d,
                    conversion: (d.leads ?? 0) > 0 ? Math.round((d.clients / (d.leads ?? 1)) * 10000) / 100 : 0
                  }))
                  return (
                    <div className="h-36 w-full rounded-md bg-blue-50/50 dark:bg-blue-950/20 px-1 pb-0 pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={conversionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 2" stroke="#94a3b8" strokeOpacity={0.3} vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                          <YAxis tickFormatter={(v) => `${formatNumber(v)}%`} tick={{ fontSize: 10, fill: 'currentColor' }} width={32} className="text-muted-foreground" />
                          <Tooltip formatter={(v: number) => [`${formatNumber(v)}%`, t('admin.dashboard.conversionRate')]} labelFormatter={(label) => label} contentStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="conversion" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 5, stroke: '#6366f1', strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {permissionChecker?.canAccessModule(Module.CLIENTS) && (
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-card dark:to-card border-emerald-200 dark:border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-foreground">{t('admin.dashboard.clientGrowth')}</CardTitle>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  {analytics.clientGrowthRate >= 0 ? '+' : ''}{formatNumber(analytics.clientGrowthRate || 0)}%
                </div>
                <p className="text-sm text-gray-600 dark:text-muted-foreground font-medium mb-3">
                  {t('admin.dashboard.monthOverMonthGrowth')}
                </p>
                {showGraphs && analytics?.chartData?.length > 0 && (
                  <div className="h-36 w-full rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 px-1 pb-0 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#94a3b8" strokeOpacity={0.3} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                        <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 10, fill: 'currentColor' }} width={32} className="text-muted-foreground" />
                        <Tooltip formatter={(v: number) => [formatNumber(v), t('admin.dashboard.cards.totalClients')]} labelFormatter={(label) => label} contentStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="clients" stroke="#059669" strokeWidth={2} fill="url(#growthFill)" dot={{ r: 4, fill: '#059669', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 5, stroke: '#059669', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </div>
        </div>

      {/* Recent Activity */}
      {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">{t('admin.dashboard.recentActivity')}</h2>
          </div>
          <Card className="group hover:shadow-lg transition-all duration-300 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardHeader>
              <CardTitle className="text-amber-800 dark:text-amber-300">{t('admin.dashboard.latestUpdates')}</CardTitle>
            </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-white/50 dark:bg-card/50 rounded-lg hover:bg-white/80 dark:hover:bg-card/80 transition-colors">
                  <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-foreground">{activity.description}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Version Display - Bottom of page */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Version {APP_VERSION_LABEL}
        </p>
      </div>

    </div>
  )
}
