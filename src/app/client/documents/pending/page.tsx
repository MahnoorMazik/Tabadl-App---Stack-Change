'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Eye } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'

export default function PendingDocumentsPage() {
  const { user } = useAuth()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()

  const pendingDocs = [
    { id: 2, name: 'Business Plan', uploadDate: '2024-01-16', size: '5.2 MB', type: 'PDF' },
  ]

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title="Pending Review"
      description="Documents awaiting review"
      icon={<Clock className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-4xl mx-auto">
        <PageUnderConstruction
          title="Pending Documents"
          description="We're still building this view. Check back soon."
        />
        <div className="hidden">
            <Card>
              <CardHeader>
                <CardTitle>Documents Under Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-600">Uploaded: {doc.uploadDate} • {doc.type} • {doc.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-100 text-amber-800">Under Review</Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
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

