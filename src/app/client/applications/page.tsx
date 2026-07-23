'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ClientSidebar } from '@/components/client-sidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage } from '@/lib/error-utils'
import { 
  ClipboardList, 
  Menu, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Calendar,
  User,
  Plus
} from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'

export default function ClientApplicationsPage() {
  const { user, token, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const { t } = useLocale()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: '',
    companyName: '',
    licenseType: '',
    visaType: '',
    bankName: '',
    serviceDetails: '',
    description: '',
    notes: '',
  })

  useEffect(() => {
    if (token) {
      fetchApplications()
    }
  }, [token])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format
      const applications = response.data.data?.applications || response.data.applications || []
      setApplications(applications)
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      setError(t('client.applications.loadFailed') || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />{t('admin.applications.pending')}</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />{t('admin.applications.approved')}</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />{t('admin.applications.rejected')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
      case 'PRO_SERVICES':
        return 'PRO Services'
      case 'OTHER':
        return 'Other'
      default:
        return type
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type) {
      toast({
        title: t('common.error'),
        description: t('client.applications.selectType') || 'Please select an application type',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await axios.post('/api/applications', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast({
        title: t('common.success'),
        description: t('client.applications.submitted') || 'Application submitted successfully!',
      })

      setIsDialogOpen(false)
      setFormData({
        type: '',
        companyName: '',
        licenseType: '',
        visaType: '',
        bankName: '',
        serviceDetails: '',
        description: '',
        notes: '',
      })
      fetchApplications()
    } catch (error: any) {
      console.error('Error submitting application:', error)
      toast({
        title: t('common.error'),
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('client.applications.loginRequired') || 'Please log in to view your applications.'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, overlay when open */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${isSidebarCollapsed ? 'w-16' : 'w-64'} 
        transition-all duration-300 flex-shrink-0
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <ClientSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => {
            setIsSidebarCollapsed(!isSidebarCollapsed)
            setIsMobileSidebarOpen(false)
          }} 
        />
      </aside>

      <div className="flex-1 flex flex-col w-full lg:w-auto">
        <header className="bg-white border-b">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setIsMobileSidebarOpen(!isMobileSidebarOpen)
                    setIsSidebarCollapsed(false)
                  }}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden lg:flex"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
                    <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{t('client.sidebar.applicationManagement')}</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{t('client.applications.description') || 'Track and manage your applications'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{t('client.applications.newApplication') || 'New Application'}</span>
                      <span className="sm:hidden">{t('common.add')}</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t('client.applications.submitNew') || 'Submit New Application'}</DialogTitle>
                      <DialogDescription>
                        {t('client.applications.submitDescription') || 'Fill in the details below to submit a new application'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">{t('client.applications.applicationType') || 'Application Type'} *</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('client.applications.selectApplicationType') || 'Select application type'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COMPANY_REGISTRATION">{t('client.applications.companyRegistration') || 'Company Registration'}</SelectItem>
                            <SelectItem value="TRADE_LICENSE">{t('client.applications.tradeLicense') || 'Trade License'}</SelectItem>
                            <SelectItem value="VISA_PROCESSING">{t('client.applications.visaProcessing') || 'Visa Processing'}</SelectItem>
                            <SelectItem value="BANK_ACCOUNT">{t('client.applications.bankAccount') || 'Bank Account'}</SelectItem>
                            <SelectItem value="PRO_SERVICES">{t('client.applications.proServices') || 'PRO Services'}</SelectItem>
                            <SelectItem value="OTHER">{t('common.other') || 'Other'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.type === 'COMPANY_REGISTRATION' && (
                        <div className="space-y-2">
                          <Label htmlFor="companyName">{t('auth.companyName')}</Label>
                          <Input
                            id="companyName"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            placeholder="Enter company name"
                          />
                        </div>
                      )}

                      {formData.type === 'TRADE_LICENSE' && (
                        <div className="space-y-2">
                          <Label htmlFor="licenseType">{t('client.applications.licenseType') || 'License Type'}</Label>
                          <Input
                            id="licenseType"
                            value={formData.licenseType}
                            onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                            placeholder={t('client.applications.enterLicenseType') || 'Enter license type'}
                          />
                        </div>
                      )}

                      {formData.type === 'VISA_PROCESSING' && (
                        <div className="space-y-2">
                          <Label htmlFor="visaType">{t('client.applications.visaType') || 'Visa Type'}</Label>
                          <Input
                            id="visaType"
                            value={formData.visaType}
                            onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                            placeholder={t('client.applications.enterVisaType') || 'Enter visa type'}
                          />
                        </div>
                      )}

                      {formData.type === 'BANK_ACCOUNT' && (
                        <div className="space-y-2">
                          <Label htmlFor="bankName">{t('client.applications.bankName') || 'Bank Name'}</Label>
                          <Input
                            id="bankName"
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            placeholder={t('client.applications.enterBankName') || 'Enter bank name'}
                          />
                        </div>
                      )}

                      {(formData.type === 'PRO_SERVICES' || formData.type === 'OTHER') && (
                        <div className="space-y-2">
                          <Label htmlFor="serviceDetails">{t('client.applications.serviceDetails') || 'Service Details'}</Label>
                          <Input
                            id="serviceDetails"
                            value={formData.serviceDetails}
                            onChange={(e) => setFormData({ ...formData, serviceDetails: e.target.value })}
                            placeholder={t('client.applications.enterServiceDetails') || 'Enter service details'}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description">{t('common.description')}</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={t('client.applications.enterDescription') || 'Enter application description'}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">{t('client.applications.additionalNotes') || 'Additional Notes'}</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder={t('client.applications.enterNotes') || 'Any additional notes or requirements'}
                          rows={2}
                        />
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          disabled={isSubmitting}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? t('client.applications.submitting') || 'Submitting...' : t('client.applications.submitApplication') || 'Submit Application'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <NotificationDropdown />
                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('client.applications.totalApplications')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{applications.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.pending')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {applications.filter(app => app.status === 'PENDING').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.approved')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {applications.filter(app => app.status === 'APPROVED').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.rejected')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {applications.filter(app => app.status === 'REJECTED').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('client.sidebar.allApplications')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('client.applications.noApplicationsYet') || 'No Applications Yet'}</h3>
                    <p className="text-gray-600 mb-4">{t('client.applications.noApplicationsMessage') || "You haven't submitted any applications yet."}</p>
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      {t('client.applications.submitNew')}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">{t('client.applications.applicationId') || 'Application ID'}</TableHead>
                          <TableHead className="min-w-[140px]">{t('admin.applications.type')}</TableHead>
                          <TableHead className="min-w-[100px]">{t('admin.applications.status')}</TableHead>
                          <TableHead className="min-w-[120px]">{t('admin.applications.submittedDate')}</TableHead>
                          <TableHead className="min-w-[120px]">{t('admin.applications.assignedTo')}</TableHead>
                          <TableHead className="min-w-[100px]">{t('admin.applications.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            {application.applicationNumber || `APP-${application.id.slice(-8).toUpperCase()}`}
                          </TableCell>
                          <TableCell>{getApplicationType(application.type)}</TableCell>
                          <TableCell>{getStatusBadge(application.status)}</TableCell>
                          <TableCell>
                            {format(new Date(application.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {application.assignedTo?.name || t('admin.applications.unassigned')}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t('client.applications.viewDetails') || 'View Details'}
                            </Button>
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
        </main>
      </div>

      {/* View Application Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Application Details
            </DialogTitle>
            <DialogDescription>
              View complete information about this application
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* Application Header */}
              <div className="flex items-start justify-between pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-500">Application ID</p>
                  <p className="text-lg font-semibold">
                    {selectedApplication.applicationNumber || `APP-${selectedApplication.id.slice(-8).toUpperCase()}`}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(selectedApplication.status)}
                </div>
              </div>

              {/* Application Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Application Type</p>
                  <p className="text-base">{getApplicationType(selectedApplication.type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Submitted Date</p>
                  <p className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {format(new Date(selectedApplication.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Assigned To</p>
                  <p className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {selectedApplication.assignedTo?.name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Last Updated</p>
                  <p className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {format(new Date(selectedApplication.updatedAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {/* Type-Specific Details */}
              {selectedApplication.companyName && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Company Name</p>
                  <p className="text-base">{selectedApplication.companyName}</p>
                </div>
              )}
              {selectedApplication.licenseType && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">License Type</p>
                  <p className="text-base">{selectedApplication.licenseType}</p>
                </div>
              )}
              {selectedApplication.visaType && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Visa Type</p>
                  <p className="text-base">{selectedApplication.visaType}</p>
                </div>
              )}
              {selectedApplication.bankName && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Bank Name</p>
                  <p className="text-base">{selectedApplication.bankName}</p>
                </div>
              )}
              {selectedApplication.serviceDetails && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Service Details</p>
                  <p className="text-base">{selectedApplication.serviceDetails}</p>
                </div>
              )}

              {/* Description */}
              {selectedApplication.description && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                  <p className="text-base text-gray-700">{selectedApplication.description}</p>
                </div>
              )}

              {/* Notes */}
              {selectedApplication.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Additional Notes</p>
                  <p className="text-base text-gray-700">{selectedApplication.notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedApplication.status === 'REJECTED' && selectedApplication.rejectionReason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-1">Rejection Reason:</p>
                    <p>{selectedApplication.rejectionReason}</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Approval Details */}
              {selectedApplication.status === 'APPROVED' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <p className="font-semibold mb-1">Application Approved</p>
                    {selectedApplication.approvedBy && (
                      <p className="text-sm">
                        Approved by: {selectedApplication.approvedBy.name}
                      </p>
                    )}
                    {selectedApplication.approvedAt && (
                      <p className="text-sm">
                        on {format(new Date(selectedApplication.approvedAt), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
            {selectedApplication?.status === 'APPROVED' && (
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <FileText className="h-4 w-4 mr-2" />
                Download Documents
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
