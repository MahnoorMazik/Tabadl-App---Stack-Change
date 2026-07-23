'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Eye,
  Download,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { useLocale } from '@/contexts/LocaleContext'

export default function ClientDocumentsPage() {
  const { user } = useAuth()
  const { t } = useLocale()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()

  const documents = [
    { 
      id: 1, 
      name: 'Passport Copy', 
      status: 'approved', 
      uploadDate: '2024-01-15',
      size: '2.5 MB',
      type: 'PDF'
    },
    { 
      id: 2, 
      name: 'Business Plan', 
      status: 'under_review', 
      uploadDate: '2024-01-16',
      size: '5.2 MB',
      type: 'PDF'
    },
    { 
      id: 3, 
      name: 'Proof of Address', 
      status: 'approved', 
      uploadDate: '2024-01-16',
      size: '1.8 MB',
      type: 'PDF'
    },
    { 
      id: 4, 
      name: 'Bank Statement', 
      status: 'pending', 
      uploadDate: null,
      size: null,
      type: null
    },
    { 
      id: 5, 
      name: 'Company License', 
      status: 'pending', 
      uploadDate: null,
      size: null,
      type: null
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-800">{t('admin.applications.approved')}</Badge>
      case 'under_review':
        return <Badge className="bg-amber-100 text-amber-800">{t('admin.documents.underReview')}</Badge>
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">{t('client.documents.pendingUpload') || 'Pending Upload'}</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{t('client.documents.unknown') || 'Unknown'}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-emerald-700" />
      case 'under_review':
        return <Clock className="h-5 w-5 text-amber-600" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-gray-400" />
      default:
        return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title={t('client.documents.title')}
      description={t('client.documents.description') || 'Manage your case documents'}
      icon={<FileText className="h-5 w-5 text-emerald-600" />}
      actions={
        <Button className="bg-emerald-700 hover:bg-emerald-800 text-xs sm:text-sm">
          <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{t('client.documents.uploadDocument')}</span>
          <span className="sm:hidden">{t('common.upload')}</span>
        </Button>
      }
    >
      <div className="max-w-6xl mx-auto">
        <PageUnderConstruction
          title={t('client.documents.title')}
          description={t('common.featureComingSoon')}
        />
        <div className="hidden">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('client.sidebar.allDocuments')}</CardTitle>
                  <Button className="bg-emerald-700 hover:bg-emerald-800">
                    <Upload className="h-4 w-4 mr-2" />
                    {t('client.documents.uploadDocument')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(doc.status)}
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            {doc.uploadDate && (
                              <p className="text-sm text-gray-600">{t('client.documents.uploaded') || 'Uploaded'}: {doc.uploadDate}</p>
                            )}
                            {doc.size && doc.type && (
                              <p className="text-sm text-gray-500">{doc.type} • {doc.size}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(doc.status)}
                        {doc.uploadDate ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              {t('common.view')}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              {t('common.download')}
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
                            <Upload className="h-4 w-4 mr-1" />
                            {t('common.upload')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </MobileLayout>
  )
}

