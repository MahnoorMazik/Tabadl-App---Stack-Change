'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Eye, File } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function LeadsDocumentsPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      // Fetch all documents and filter client-side for lead documents
      const response = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format: { success: true, data: { documents: [...] } }
      const docs = response.data?.data?.documents || response.data?.documents || []
      // Filter only lead documents (where leadId is not null)
      const leadDocs = docs.filter((doc: any) => doc.leadId !== null && doc.leadId !== undefined)
      setDocuments(leadDocs)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: t('common.error'),
        description: t('admin.documents.leads.fetchFailed') || 'Failed to fetch lead documents',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (doc: any) => {
    try {
      // Extract relative path from full path
      const pathParts = doc.path.split(/[\\/]/)
      const relativePath = pathParts.slice(pathParts.indexOf('uploads')).join('/')
      
      const response = await axios.get(`/api/documents/download/${relativePath}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.originalName)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('admin.documents.downloadFailed') || 'Failed to download document',
        variant: 'destructive'
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return formatNumber(bytes) + ' B'
    if (bytes < 1024 * 1024) return formatNumber((bytes / 1024).toFixed(1)) + ' KB'
    return formatNumber((bytes / (1024 * 1024)).toFixed(1)) + ' MB'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
    if (mimeType.startsWith('image/')) return <File className="h-4 w-4 text-blue-500" />
    return <File className="h-4 w-4 text-gray-500" />
  }

  return (
    <AdminPageTemplate
      title={t('admin.documents.leads.title') || 'Leads Documents'}
      description={t('admin.documents.leads.description') || 'All documents uploaded for leads'}
      icon={<FileText className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.documents.leads.title') || 'Leads Documents'}
        description={t('admin.documents.leads.underConstruction') || 'Lead document management is under construction.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="space-y-6 hidden">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.documents.totalDocuments') || 'Total Documents'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatNumber(documents.length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.documents.pdfFiles') || 'PDF Files'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(documents.filter(d => d.mimeType === 'application/pdf').length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">{t('admin.documents.imageFiles') || 'Image Files'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(documents.filter(d => d.mimeType?.startsWith('image/')).length)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.documents.leads.allDocuments') || 'All Lead Documents'} ({formatNumber(documents.length)})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('admin.documents.loadingDocuments') || 'Loading documents...'}</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('admin.documents.noDocumentsFound') || 'No documents found'}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.documents.document') || 'Document'}</TableHead>
                    <TableHead className="w-[140px] min-w-[140px]">{t('admin.leads.lead')}</TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead>{t('common.uploadedBy') || 'Uploaded By'}</TableHead>
                    <TableHead>{t('admin.documents.uploadDate') || 'Upload Date'}</TableHead>
                    <TableHead>{t('common.size')}</TableHead>
                    <TableHead className="w-[120px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.mimeType)}
                          <span className="font-medium">{doc.originalName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[140px] min-w-[140px]">
                        {doc.lead ? (
                          <div>
                            <div className="font-medium truncate" title={doc.lead.fullName}>{doc.lead.fullName}</div>
                            <div className="text-sm text-gray-500">{doc.lead.leadNumber}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">{t('common.n/a')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-700">{doc.name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 text-sm">{doc.description || '-'}</span>
                      </TableCell>
                      <TableCell>{doc.uploadedBy?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{formatFileSize(doc.size)}</TableCell>
                      <TableCell className="w-[120px]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t('common.download')}
                        </Button>
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

