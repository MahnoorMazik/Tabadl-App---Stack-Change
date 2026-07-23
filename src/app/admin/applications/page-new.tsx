'use client'

import { useState, useEffect } from 'react'
import { useSearch } from '@/hooks/use-search'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Search, Eye, User, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

export default function AdminApplicationsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Use the new search hook
  const {
    data: applications,
    loading,
    error: searchError,
    search,
    setSearch,
    refetch
  } = useSearch<any>({
    endpoint: '/api/applications',
    token: token || '',
    minLength: 3,
    debounceMs: 500,
    searchFields: ['applicationNumber', 'companyName', 'client.user.name', 'client.user.email'],
    initialLoad: true // Load applications on page load
  })

  // Remove old fetchApplications function - now handled by useSearch hook

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1 inline" />Pending</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1 inline" />Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1 inline" />Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getApplicationType = (type: string) => {
    return type?.replace(/_/g, ' ') || 'Unknown'
  }

  // Filter applications based on status (search is handled by the hook)
  const filteredApplications = (applications || []).filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    return matchesStatus
  })

  const stats = {
    total: (applications || []).length,
    pending: (applications || []).filter(a => a.status === 'PENDING').length,
    approved: (applications || []).filter(a => a.status === 'APPROVED').length,
    rejected: (applications || []).filter(a => a.status === 'REJECTED').length
  }

  return (
    <AdminPageTemplate
      title="Applications Management"
      description="Manage all client applications"
      icon={<FileText className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by application number, client, or company... (min 3 chars)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Applications ({filteredApplications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading applications...</div>
            ) : searchError ? (
              <div className="text-center py-8 text-red-500">
                Error loading applications: {searchError}
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {search.length >= 3 ? 'No applications found matching your search.' : 'No applications found'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.applicationNumber}</TableCell>
                      <TableCell>{getApplicationType(app.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{app.user?.name}</p>
                            <p className="text-xs text-gray-500">{app.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(app.submittedAt || app.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {app.assignedTo.name}
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/applications/${app.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
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

