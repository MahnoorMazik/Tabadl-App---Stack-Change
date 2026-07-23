'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Plus,
  MessageSquare
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Task {
  id: string
  title: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  dueDate?: string
  application: {
    id: string
    applicationNumber: string
    user: {
      name: string
      email: string
    }
  }
}

interface Application {
  id: string
  applicationNumber: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS'
  createdAt: string
  description?: string
  type: string
  user: {
    id: string
    name: string
    email: string
  }
  tasks: Task[]
  documents: {
    id: string
    filename: string
    status: 'UPLOADED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  }[]
  _count: {
    tasks: number
    documents: number
    notes: number
    messages: number
  }
}

export default function StaffDashboard() {
  const { user, token, loading } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  const fetchData = async () => {
    try {
      console.log('🔍 Staff dashboard fetching data...', { token: token ? 'exists' : 'missing' })
      
      const [applicationsResponse, tasksResponse] = await Promise.all([
        fetch('/api/applications', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/tasks/assigned', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      console.log('📊 Applications response:', applicationsResponse.status, applicationsResponse.ok)
      console.log('📊 Tasks response:', tasksResponse.status, tasksResponse.ok)

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json()
        console.log('📋 Applications data:', applicationsData)
        // Handle structured response format: { success: true, data: { applications: [...] } }
        const applications = applicationsData?.data?.applications || applicationsData?.applications || applicationsData
        setApplications(Array.isArray(applications) ? applications : [])
      } else {
        console.error('❌ Applications API error:', applicationsResponse.status, await applicationsResponse.text())
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        console.log('📋 Tasks data:', tasksData)
        // Handle structured response format: { success: true, data: { tasks: [...] } }
        const tasks = tasksData?.data?.tasks || tasksData?.tasks || tasksData
        setTasks(Array.isArray(tasks) ? tasks : [])
      } else {
        console.error('❌ Tasks API error:', tasksResponse.status, await tasksResponse.text())
      }
    } catch (error) {
      console.error('❌ Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <div>Please log in</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800'
      case 'IN_PROGRESS':
      case 'UNDER_REVIEW':
        return 'bg-amber-100 text-amber-800'
      case 'PENDING':
      case 'ONBOARDING':
        return 'bg-gray-100 text-gray-800'
      case 'OVERDUE':
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />
      case 'IN_PROGRESS':
      case 'UNDER_REVIEW':
        return <Clock className="h-4 w-4" />
      case 'PENDING':
      case 'ONBOARDING':
        return <AlertCircle className="h-4 w-4" />
      case 'OVERDUE':
      case 'REJECTED':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const activeApplications = applications.filter(app => app.status !== 'APPROVED' && app.status !== 'REJECTED')
  const pendingTasks = tasks.filter(task => task.status === 'PENDING')
  const overdueTasks = tasks.filter(task => task.status === 'OVERDUE')
  const totalMessages = applications.reduce((acc, app) => acc + app._count.messages, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src="/logo-horizontal.png" alt="TABADL ALKON" className="h-8 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Staff Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeApplications.length}</div>
              <p className="text-xs text-muted-foreground">Currently managing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
              <p className="text-xs text-muted-foreground">Need immediate action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Client Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMessages}</div>
              <p className="text-xs text-muted-foreground">Unread messages</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Applications */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Recent Applications</h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            
            <div className="space-y-4">
              {applications.slice(0, 5).map((application) => (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-slate-900">{application.applicationNumber}</h3>
                        <p className="text-sm text-slate-600">{application.user.name}</p>
                        <p className="text-xs text-slate-500">{application.user.email}</p>
                      </div>
                      <Badge className={getStatusColor(application.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(application.status)}
                          <span>{application.status.replace('_', ' ')}</span>
                        </div>
                      </Badge>
                    </div>
                    
                    {application.description && (
                      <p className="text-sm text-slate-600 mb-3">{application.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Submitted: {new Date(application.createdAt).toLocaleDateString()}</span>
                      <div className="flex space-x-4">
                        <span>{application._count.tasks} tasks</span>
                        <span>{application._count.documents} documents</span>
                        <span>{application._count.messages} messages</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* My Tasks */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">My Tasks</h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            
            <div className="space-y-4">
              {tasks.slice(0, 5).map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-slate-900">{task.title}</h3>
                      <Badge variant="outline" className={getStatusColor(task.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(task.status)}
                          <span>{task.status.replace('_', ' ')}</span>
                        </div>
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3">
                      Application: {task.application.applicationNumber} - {task.application.user.name}
                    </p>
                    
                    {task.dueDate && (
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        <Button size="sm" variant="outline">
                          Complete Task
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Create New Application</h3>
                <p className="text-sm text-slate-600 mt-1">Start a new service application</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Manage Leads</h3>
                <p className="text-sm text-slate-600 mt-1">Convert prospects to clients</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Review Documents</h3>
                <p className="text-sm text-slate-600 mt-1">Approve pending documents</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">View Reports</h3>
                <p className="text-sm text-slate-600 mt-1">Analytics and insights</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}