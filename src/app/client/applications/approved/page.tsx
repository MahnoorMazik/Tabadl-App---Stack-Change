'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Eye, 
  User,
  AlertCircle,
  Download,
  Menu
} from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import Link from 'next/link'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'

export default function ApprovedApplicationsPage() {
  const { user, token, loading: authLoading } = useAuth()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      fetchApprovedApplications()
    }
  }, [token])

  const fetchApprovedApplications = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/applications?status=APPROVED', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format
      const applications = response.data.data?.applications || response.data.applications || []
      setApplications(applications)
    } catch (error: any) {
      console.error('Error fetching approved applications:', error)
      setError('Failed to load approved applications')
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
      title="Approved Applications"
      description="Successfully approved applications"
      icon={<CheckCircle className="h-5 w-5 text-green-600" />}
    >
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Approved Applications ({applications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Congratulations! These applications have been approved and processed successfully.
                </p>
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>Approved Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Approved Applications</h3>
                    <p className="text-gray-600 mb-4">You don't have any approved applications yet.</p>
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
                          <TableHead className="min-w-[120px]">Approved Date</TableHead>
                          <TableHead className="min-w-[120px]">Approved By</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[150px]">Actions</TableHead>
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
                          <TableCell className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {application.approvedBy?.name || 'System'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download
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
