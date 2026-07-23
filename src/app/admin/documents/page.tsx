'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Folder, Eye, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function DocumentsPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format: { success: true, data: { documents: [...] } }
      const documents = response.data?.data?.documents || response.data?.documents || []
      setDocuments(documents)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (documentId: string, status: string) => {
    try {
      await axios.patch(`/api/documents/${documentId}`, {
        status,
        reviewNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({ title: t('common.success'), description: `${t('admin.documents.document')} ${status.toLowerCase()}` })
      fetchDocuments()
      setSelectedDoc(null)
      setReviewNotes('')
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.documents.reviewFailed') || 'Failed to review document',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const configs: any = {
      UPLOADED: { color: 'bg-blue-100 text-blue-700', icon: Clock },
      UNDER_REVIEW: { color: 'bg-amber-100 text-amber-700', icon: Eye },
      APPROVED: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircle }
    }
    const config = configs[status] || configs.UPLOADED
    const Icon = config.icon
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const filteredDocs = documents.filter(doc => 
    statusFilter === 'all' || doc.status === statusFilter
  )

  return (
    <AdminPageTemplate
      title={t('admin.sidebar.documentLibrary')}
      description={t('admin.documents.description')}
      icon={<Folder className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.sidebar.documentLibrary')}
        description={t('admin.documents.underConstruction') || "Document management for admins is under construction."}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="space-y-6 hidden">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.documents.totalDocuments')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(documents.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.documents.pendingReview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatNumber(documents.filter(d => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW').length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.approved')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatNumber(documents.filter(d => d.status === 'APPROVED').length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.applications.rejected')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(documents.filter(d => d.status === 'REJECTED').length)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex justify-between items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('admin.documents.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.documents.allDocuments')}</SelectItem>
              <SelectItem value="UPLOADED">{t('admin.documents.uploaded')}</SelectItem>
              <SelectItem value="UNDER_REVIEW">{t('admin.documents.underReview')}</SelectItem>
              <SelectItem value="APPROVED">{t('admin.applications.approved')}</SelectItem>
              <SelectItem value="REJECTED">{t('admin.applications.rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.documents.title')} ({formatNumber(filteredDocs.length)})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('admin.documents.noDocuments')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.documents.fileName')}</TableHead>
                    <TableHead>{t('admin.documents.case')}</TableHead>
                    <TableHead>{t('admin.documents.uploadedBy')}</TableHead>
                    <TableHead>{t('admin.documents.uploadDate')}</TableHead>
                    <TableHead>{t('admin.documents.size')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.originalName}</TableCell>
                      <TableCell>{doc.case?.caseNumber}</TableCell>
                      <TableCell>{doc.uploadedBy?.name}</TableCell>
                      <TableCell>{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{formatNumber((doc.size / 1024).toFixed(1))} KB</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('admin.documents.review')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('admin.documents.reviewDocument')}</DialogTitle>
                            </DialogHeader>
                            {selectedDoc && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('admin.documents.fileName')}</label>
                                    <p>{selectedDoc.originalName}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('admin.documents.type')}</label>
                                    <p>{selectedDoc.mimeType}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('admin.documents.case')}</label>
                                    <p>{selectedDoc.case?.caseNumber}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">{t('admin.documents.uploadedBy')}</label>
                                    <p>{selectedDoc.uploadedBy?.name}</p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>{t('admin.documents.reviewNotes')}</Label>
                                  <Textarea
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder={t('admin.documents.addReviewComments')}
                                    rows={3}
                                  />
                                </div>
                              </div>
                            )}
                            <DialogFooter className="gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleReview(selectedDoc.id, 'UNDER_REVIEW')}
                              >
                                {t('admin.documents.markUnderReview')}
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleReview(selectedDoc.id, 'REJECTED')}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t('admin.documents.reject')}
                              </Button>
                              <Button
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleReview(selectedDoc.id, 'APPROVED')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t('admin.documents.approve')}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
