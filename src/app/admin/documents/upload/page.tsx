'use client'

import { useState, useEffect } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, CheckCircle } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useLocale } from '@/contexts/LocaleContext'

export default function UploadDocumentsPage() {
  const { token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [applications, setApplications] = useState<any[]>([])
  const [selectedApplication, setSelectedApplication] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await axios.get('/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle structured response format
      const applications = response.data.data?.applications || response.data.applications || []
      setApplications(applications)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedApplication) {
      toast({
        title: t('common.error'),
        description: t('admin.documents.selectApplicationAndFile') || 'Please select an application and file',
        variant: 'destructive'
      })
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('applicationId', selectedApplication)

      await axios.post('/api/documents', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: t('common.success'),
        description: t('admin.documents.uploadSuccess') || 'Document uploaded successfully'
      })

      // Reset form
      setFile(null)
      setSelectedApplication('')
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.documents.uploadFailed') || 'Failed to upload document',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.documents.uploadDocuments') || 'Upload Documents'}
      description={t('admin.documents.uploadDescription') || 'Upload new documents to applications'}
      icon={<Upload className="h-6 w-6" />}
      showConstruction={false}
    >
      <PageUnderConstruction
        title={t('admin.documents.uploadDocuments') || 'Upload Documents'}
        description={t('admin.documents.uploadUnderConstruction') || 'This feature is under construction and will be available soon.'}
        backHref="/admin/dashboard"
        backLabel={t('common.backToDashboard')}
      />
      <div className="max-w-2xl hidden">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.documents.uploadDocument') || 'Upload Document'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t('admin.documents.selectApplication') || 'Select Application'} *</Label>
              <Select value={selectedApplication} onValueChange={setSelectedApplication}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.documents.selectApplicationPlaceholder') || 'Select an application...'} />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((application) => (
                    <SelectItem key={application.id} value={application.id}>
                      {application.applicationNumber} - {application.user?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.documents.selectFile') || 'Select File'} *</Label>
              <Input
                id="file-input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <p className="text-sm text-gray-500">
                {t('admin.documents.supportedFormats') || 'Supported formats: PDF, Word, Images. Max size: 10MB'}
              </p>
            </div>

            {file && (
              <div className="border rounded p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-600">{formatNumber((file.size / 1024).toFixed(2))} KB</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !selectedApplication}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {uploading ? t('admin.documents.uploading') || 'Uploading...' : t('admin.documents.uploadDocument') || 'Upload Document'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
