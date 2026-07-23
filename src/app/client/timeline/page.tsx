'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { PageUnderConstruction } from '@/components/PageUnderConstruction'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'

export default function ClientTimelinePage() {
  const { user } = useAuth()
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, toggleDesktopSidebar, closeMobileSidebar } = useMobileSidebar()

  const timeline = [
    { 
      date: '2024-01-10', 
      time: '10:30 AM',
      title: 'Application Submitted', 
      status: 'completed',
      description: 'Your company registration application has been successfully submitted to our team.'
    },
    { 
      date: '2024-01-12', 
      time: '02:15 PM',
      title: 'Document Review Started', 
      status: 'completed',
      description: 'All submitted documents are now under review by our compliance team.'
    },
    { 
      date: '2024-01-15', 
      time: '11:45 AM',
      title: 'Documents Approved', 
      status: 'completed',
      description: 'Your passport copy and proof of address have been approved.'
    },
    { 
      date: '2024-01-16', 
      time: '09:20 AM',
      title: 'MISA Application Processing', 
      status: 'in-progress',
      description: 'Currently processing your MISA license application with government authorities.'
    },
    { 
      date: '2024-01-20', 
      time: 'TBD',
      title: 'Chamber of Commerce Registration', 
      status: 'pending',
      description: 'Next step: Register with Chamber of Commerce after MISA approval.'
    },
    { 
      date: '2024-01-25', 
      time: 'TBD',
      title: 'Final Registration', 
      status: 'pending',
      description: 'Final company registration and license issuance.'
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-emerald-700" />
      case 'in-progress':
        return <Clock className="h-6 w-6 text-blue-600" />
      case 'pending':
        return <AlertCircle className="h-6 w-6 text-gray-400" />
      default:
        return <Clock className="h-6 w-6 text-gray-400" />
    }
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title="Application Timeline"
      description="Track your registration progress"
      icon={<Calendar className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-4xl mx-auto">
        <PageUnderConstruction
          title="Application Timeline"
          description="This feature is currently being developed and will be available soon."
        />
        <div className="hidden">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Registration Timeline
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-800">Application: APP-2024-001</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 relative">
                  {/* Timeline Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  {timeline.map((item, index) => (
                    <div key={index} className="flex gap-6 relative">
                      {/* Icon */}
                      <div className="flex-shrink-0 z-10 bg-white">
                        {getStatusIcon(item.status)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span>{item.time}</span>
                          </div>
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

