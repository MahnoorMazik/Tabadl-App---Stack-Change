'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertCircle, 
  Eye, 
  User,
  RefreshCw
} from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import Link from 'next/link'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'

export default function RejectedApplicationsPage() {
  const { user, token, loading: authLoading } = useAuth()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      fetchRejectedApplications()
    }
  }, [token])

  const fetchRejectedApplications = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/applications?status=REJECTED', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format
      const applications = response.data.data?.applications || response.data.applications || []
      setApplications(applications)
    } catch (error: any) {
      console.error('Error fetching rejected applications:', error)
      setError('Failed to load rejected applications')
    } finally {
      setLoading(false)
    }
  }

  const getApplicationType = (type: string) => {
    switch (type) {
      case 'COMPANY_REGISTRATION':
        return 'Company Registration'
      case 'TRADE_LICENSE':
        return 'Trade License'
      case 'VISA_PROCESSING':
        return 'Visa Processing'
      case 'BANK_ACCOUNT':
        return 'Bank Account'
      default:
        return type
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to view your applications.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title="Rejected Applications"
      description="Applications that require attention"
      icon={<AlertCircle className="h-5 w-5 text-red-600" />}
    >
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Rejected Applications ({applications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  These applications were rejected and may require additional information or corrections.
                </p>
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>Rejected Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rejected Applications</h3>
                    <p className="text-gray-600 mb-4">Great! You don't have any rejected applications.</p>
                    <Link href="/client/applications">
                      <Button variant="outline">
                        View All Applications
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Application ID</TableHead>
                          <TableHead className="min-w-[140px]">Type</TableHead>
                          <TableHead className="min-w-[120px]">Rejected Date</TableHead>
                          <TableHead className="min-w-[150px]">Reason</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            {application.applicationNumber || `APP-${application.id.slice(-8).toUpperCase()}`}
                          </TableCell>
                          <TableCell>{getApplicationType(application.type)}</TableCell>
                          <TableCell>
                            {format(new Date(application.updatedAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={application.rejectionReason || 'No reason provided'}>
                              {application.rejectionReason || 'No reason provided'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resubmit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
      </div>
    </MobileLayout>
  )
}
