'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'

export default function ClientNotificationsPage() {
  const { user } = useAuth()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()

  const notifications = [
    {
      id: 1,
      title: 'Document Approved',
      message: 'Your passport copy has been approved by our team.',
      timestamp: '2 hours ago',
      isRead: false,
      type: 'success'
    },
    {
      id: 2,
      title: 'Action Required',
      message: 'Please upload your bank statement to proceed with your application.',
      timestamp: '1 day ago',
      isRead: false,
      type: 'warning'
    },
    {
      id: 3,
      title: 'New Message',
      message: 'You have a new message from your case manager.',
      timestamp: '2 days ago',
      isRead: true,
      type: 'info'
    },
  ]

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-700" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />
      case 'info':
        return <FileText className="h-5 w-5 text-blue-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title="Notifications"
      description="Stay updated on your case"
      icon={<Bell className="h-5 w-5 text-emerald-600" />}
      actions={
        <Button variant="outline" size="sm" className="text-xs sm:text-sm">
          Mark all as read
        </Button>
      }
    >
      <div className="max-w-3xl mx-auto">
        <PageUnderConstruction
          title="Notifications"
          description="This feature is currently being developed and will be available soon."
        />
        <div className="hidden">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Notifications</CardTitle>
                  <Button variant="outline" size="sm">Mark all as read</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                        !notif.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notif.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{notif.title}</h4>
                            {!notif.isRead && (
                              <Badge className="bg-blue-600 text-white text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notif.timestamp}</p>
                        </div>
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

