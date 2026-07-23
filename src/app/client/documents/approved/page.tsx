'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Eye, Download } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'

export default function ApprovedDocumentsPage() {
  const { user } = useAuth()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()

  const approvedDocs = [
    { id: 1, name: 'Passport Copy', uploadDate: '2024-01-15', size: '2.5 MB', type: 'PDF' },
    { id: 3, name: 'Proof of Address', uploadDate: '2024-01-16', size: '1.8 MB', type: 'PDF' },
  ]

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title="Approved Documents"
      description="Successfully reviewed documents"
      icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-4xl mx-auto">
        <PageUnderConstruction
          title="Approved Documents"
          description="This section is under construction and will be available soon."
        />
        <div className="hidden">
            <Card>
              <CardHeader>
                <CardTitle>Approved Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {approvedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50 border-emerald-200">
                      <div className="flex items-center gap-4">
                        <CheckCircle className="h-5 w-5 text-emerald-700" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-600">Uploaded: {doc.uploadDate} • {doc.type} • {doc.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
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

