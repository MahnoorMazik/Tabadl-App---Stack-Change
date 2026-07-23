'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { FileText, Search, Eye, User, Calendar, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/LocaleContext'

export default function AdminApplicationsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t, formatNumber } = useLocale()
  const [statusFilter, setStatusFilter] = useState('all')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Fetch applications with pagination
  const fetchApplications = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    
    setLoading(true)
    setSearchError(null)
    
    try {
      const params = new URLSearchParams()
      
      // Add filters
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      
      // Add pagination
      params.append('page', currentPage.toString())
      if (rowsPerPage === 'all') {
        params.append('limit', 'all')
      } else {
        params.append('limit', rowsPerPage.toString())
      }
      
      const response = await axios.get(`/api/applications?${params.toString()}`, {
        headers
      })
      
      // Handle structured response format
      const responseData = response.data?.data || response.data
      if (responseData?.applications) {
        setApplications(responseData.applications)
      }
      if (responseData?.pagination) {
        setPagination(responseData.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      setSearchError(error.response?.data?.error || t('admin.applications.failedToFetch'))
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter, debouncedSearch, currentPage, rowsPerPage])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch applications when dependencies change
  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, debouncedSearch, rowsPerPage])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1 inline" />Pending</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1 inline" />Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1 inline" />Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getApplicationType = (type: string | null) => {
    return type?.replace(/_/g, ' ') || t('admin.applications.unknown')
  }

  // Applications are already filtered and paginated by the server
  const displayedApplications = applications || []

  // Stats are calculated from current page data (limited accuracy)
  // TODO: Add dedicated stats endpoint for accurate counts
  const stats = {
    total: pagination.total || displayedApplications.length,
    pending: displayedApplications.filter(a => a.status === 'PENDING').length,
    approved: displayedApplications.filter(a => a.status === 'APPROVED').length,
    rejected: displayedApplications.filter(a => a.status === 'REJECTED').length
  }

  return (
    <AdminPageTemplate
      title={t('admin.applications.title')}
      description={t('admin.applications.description')}
      icon={<FileText className="h-6 w-6" />}
      showConstruction={false}
      requiredPermission="applications.view"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.totalApplications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.total)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.pending')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatNumber(stats.pending)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.approved')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatNumber(stats.approved)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.rejected')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatNumber(stats.rejected)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('admin.applications.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={t('admin.applications.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')} {t('common.status')}</SelectItem>
                  <SelectItem value="PENDING">{t('admin.applications.pending')}</SelectItem>
                  <SelectItem value="APPROVED">{t('admin.applications.approved')}</SelectItem>
                  <SelectItem value="REJECTED">{t('admin.applications.rejected')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label htmlFor="rowsPerPage" className="text-sm whitespace-nowrap">{t('common.rows')}:</Label>
                <Select value={rowsPerPage === 'all' ? 'all' : rowsPerPage.toString()} onValueChange={(value) => {
                  setRowsPerPage(value === 'all' ? 'all' : Number(value))
                  setCurrentPage(1)
                }}>
                  <SelectTrigger id="rowsPerPage" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">{formatNumber(10)}</SelectItem>
                    <SelectItem value="25">{formatNumber(25)}</SelectItem>
                    <SelectItem value="50">{formatNumber(50)}</SelectItem>
                    <SelectItem value="100">{formatNumber(100)}</SelectItem>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : searchError ? (
              <div className="text-center py-8 text-red-500">
                {t('common.error')}: {searchError}
              </div>
            ) : displayedApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {search.length >= 3 ? t('common.noResults') : t('admin.applications.noApplications')}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>{t('admin.applications.applicationNumber')}</TableHead>
                    <TableHead>{t('admin.applications.type')}</TableHead>
                    <TableHead>{t('admin.applications.client')}</TableHead>
                    <TableHead>{t('admin.applications.status')}</TableHead>
                    <TableHead>{t('admin.applications.submittedDate') || 'Submitted Date'}</TableHead>
                    <TableHead>{t('admin.applications.assignedTo')}</TableHead>
                    <TableHead>{t('admin.applications.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedApplications.map((app) => (
                    <TableRow 
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => {
                        router.push(`/admin/applications/${app.id}`)
                      }}
                    >
                      <TableCell className="font-medium">{app.applicationNumber}</TableCell>
                      <TableCell>{getApplicationType(app.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{app.client?.user?.name || app.client?.name || t('admin.applications.notAvailable')}</p>
                            <p className="text-xs text-gray-500">{app.client?.user?.email || app.client?.email || ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(app.submittedAt || app.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {app.assignedTo.name}
                          </div>
                        ) : (
                          <span className="text-gray-400">{t('admin.applications.unassigned')}</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/applications/${app.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('admin.applications.view')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination Controls */}
              {rowsPerPage !== 'all' && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {t('admin.applications.showing')} {formatNumber(((currentPage - 1) * (typeof rowsPerPage === 'number' ? rowsPerPage : 25)) + 1)} {t('admin.applications.to')} {formatNumber(Math.min(currentPage * (typeof rowsPerPage === 'number' ? rowsPerPage : 25), pagination.total))} {t('admin.applications.of')} {formatNumber(pagination.total)} {t('admin.applications.applications')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPreviousPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm text-gray-600">
                      {t('common.page')} {formatNumber(currentPage)} {t('admin.applications.of')} {formatNumber(pagination.totalPages)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={!pagination.hasNextPage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {rowsPerPage === 'all' && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {t('admin.applications.showingAll')} {formatNumber(pagination.total)} {t('admin.applications.applications')}
                  </div>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}

