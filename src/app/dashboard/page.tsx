'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ClientSidebar } from '@/components/client-sidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import Link from 'next/link'
import Image from 'next/image'
import {
  FileText,
  Clock,
  CheckCircle,
  Menu,
  DollarSign,
  Calendar,
  Upload,
  MessageSquare,
  Eye,
  Building2,
  LogIn,
  Plus,
  ClipboardList
} from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import { useLocale } from '@/contexts/LocaleContext'

export default function Dashboard() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const { t } = useLocale()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    // The API routes use withAuth middleware which checks session cookies
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    
    try {
      setLoading(true)
      
      const [analyticsRes, applicationsRes, docsRes, invoicesRes] = await Promise.all([
        axios.get('/api/analytics/dashboard', {
          headers,
          withCredentials: true // Ensure cookies are sent
        }).catch((error) => {
          console.error('Error fetching analytics:', error)
          // Return default analytics structure on error
          return { 
            data: { 
              success: true,
              data: { 
                analytics: {
                  totalApplications: 0,
                  activeApplications: 0,
                  completedApplications: 0,
                  totalTasks: 0,
                  completedTasks: 0,
                  pendingTasks: 0,
                  totalInvoices: 0,
                  paidInvoices: 0,
                  pendingInvoices: 0,
                  totalInvoiceAmount: 0
                }
              }
            }
          }
        }),
        axios.get('/api/applications', {
          headers,
          withCredentials: true
        }).catch(() => ({ data: { applications: [] } })),
        axios.get('/api/documents', {
          headers,
          withCredentials: true
        }).catch(() => ({ data: { documents: [] } })),
        axios.get('/api/invoices', {
          headers,
          withCredentials: true
        }).catch(() => ({ data: { invoices: [] } }))
      ])

      // Handle different response structures
      // Analytics: { success: true, data: { analytics: {...} } } or { analytics: {...} }
      const analyticsData = analyticsRes.data?.data?.analytics || analyticsRes.data?.analytics || {
        totalApplications: 0,
        activeApplications: 0,
        completedApplications: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        totalInvoiceAmount: 0
      }
      setAnalytics(analyticsData)
      
      // Applications: { success: true, data: { applications: [...] } } or { applications: [...] }
      const apps = applicationsRes.data?.data?.applications || applicationsRes.data?.applications || []
      setApplications(Array.isArray(apps) ? apps : [])
      
      // Documents: { success: true, data: { documents: [...] } } or { documents: [...] }
      const docs = docsRes.data?.data?.documents || docsRes.data?.documents || []
      setDocuments(Array.isArray(docs) ? docs : [])
      
      // Invoices: { success: true, data: { invoices: [...] } } or { invoices: [...] }
      const invs = invoicesRes.data?.data?.invoices || invoicesRes.data?.invoices || []
      setInvoices(Array.isArray(invs) ? invs : [])
    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error)
      // Set default data on error so dashboard still displays
      setAnalytics({
        totalApplications: 0,
        activeApplications: 0,
        completedApplications: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        totalInvoiceAmount: 0
      })
      setApplications([])
      setDocuments([])
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [token])

  // Redirect staff to admin dashboard
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'STAFF') {
        router.push('/admin/dashboard')
        return
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (token && user?.role === 'CLIENT') {
      fetchDashboardData()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [token, authLoading, user, fetchDashboardData])

  const totalTasks = analytics?.totalTasks || 0
  const completedTasks = analytics?.completedTasks || 0
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show login required if not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center">
              <LogIn className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">{t('client.dashboard.loginRequired') || 'Login Required'}</CardTitle>
            <CardDescription className="text-lg">
              {t('client.dashboard.loginMessage') || 'Please login to access your dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/login" className="block">
              <Button 
                className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg shadow-lg"
                size="lg"
              >
                <Building2 className="h-6 w-6 mr-3" />
                {t('client.dashboard.loginToContinue') || 'Login to Continue'}
              </Button>
            </Link>

            <div className="text-center text-sm text-gray-600">
              {t('auth.dontHaveAccount')}{' '}
              <Link href="/signup" className="text-emerald-700 font-semibold hover:text-emerald-800 hover:underline">
                {t('auth.signup')}
              </Link>
            </div>

            <div className="pt-4 text-center text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900 hover:underline">
                {t('auth.backToHome')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (authLoading || loading || user?.role === 'STAFF') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-700"></div>
      </div>
    )
  }

  // Client Dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex">
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0`}>
        <ClientSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-card border-b dark:border-border">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">{t('client.dashboard.title')}</h1>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <NotificationDropdown />
                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('client.dashboard.totalApplications') || 'Total Applications'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{applications.length}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    {applications.filter(a => a.status === 'PENDING').length} {t('common.pending')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('client.dashboard.documents') || 'Documents'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{documents.length}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    {documents.filter(d => d.status === 'APPROVED').length} {t('admin.applications.approved')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('client.dashboard.taskProgress') || 'Task Progress'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
                  <Progress value={progressPercentage} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('client.dashboard.invoices') || 'Invoices'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invoices.length}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    {invoices.filter(i => i.status === 'PAID').length} {t('client.dashboard.paid') || 'paid'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active Applications */}
            <Card>
              <CardHeader>
                <CardTitle>{t('client.dashboard.yourApplications') || 'Your Applications'}</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">{t('client.applications.noApplications')}</p>
                ) : (
                  <div className="space-y-3">
                    {applications.slice(0, 5).map((app: any) => (
                      <div key={app.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-semibold">{app.applicationNumber}</p>
                              <p className="text-sm text-gray-600">{app.type?.replace(/_/g, ' ')}</p>
                              {app.description && (
                                <p className="text-xs text-gray-500 mt-1">{app.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline"
                            className={
                              app.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                              app.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }
                          >
                            {app.status}
                          </Badge>
                          <Link href={`/client/applications`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              {t('common.view')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('client.dashboard.recentDocuments') || 'Recent Documents'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">{t('client.documents.noDocuments')}</p>
                  ) : (
                    <div className="space-y-2">
                      {documents.slice(0, 5).map((doc: any) => (
                        <div key={doc.id} className="flex justify-between items-center p-2 border rounded">
                          <span className="text-sm">{doc.originalName}</span>
                          <Badge variant="outline">{doc.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('client.dashboard.invoices')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">{t('client.dashboard.noInvoices') || 'No invoices'}</p>
                  ) : (
                    <div className="space-y-2">
                      {invoices.slice(0, 5).map((invoice: any) => (
                        <div key={invoice.id} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-gray-600">
                              SAR {invoice.amount?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <Badge variant="outline">{invoice.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('client.dashboard.quickActions') || 'Quick Actions'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/client/applications">
                    <Button variant="outline" className="w-full justify-start bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('client.dashboard.addApplication') || 'Add Application'}
                    </Button>
                  </Link>
                  <Link href="/client/documents/upload">
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      {t('client.documents.uploadDocument')}
                    </Button>
                  </Link>
                  <Link href="/client/messages">
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t('client.sidebar.messages')}
                    </Button>
                  </Link>
                  <Link href="/client/timeline">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('client.sidebar.timeline')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
