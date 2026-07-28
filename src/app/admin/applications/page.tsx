'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { wizardStatusClasses, wizardStatusLabel } from '@/lib/wizards/wizard-status'

type ApplicationRow = {
  id: string
  applicationNumber: string
  status: string
  areaOfInterest: string
  currentStepIndex: number
  submittedAt: string | null
  updatedAt: string
  createdAt: string
  client: { id: string; name: string; email: string }
  wizard: { id: string; name: string; areaOfInterest: string }
  progress: { totalSteps: number; completedSteps: number; currentStepIndex: number }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('border', wizardStatusClasses(status))}>
      {status === 'DRAFT' && <Play className="h-3 w-3 mr-1" />}
      {status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
      {status === 'IN_PROGRESS' && <Loader2 className="h-3 w-3 mr-1" />}
      {(status === 'APPROVED' || status === 'COMPLETED') && (
        <CheckCircle className="h-3 w-3 mr-1" />
      )}
      {status === 'REJECTED' && <AlertCircle className="h-3 w-3 mr-1" />}
      {status === 'HARD_COPY_REQUIRED' && <FileText className="h-3 w-3 mr-1" />}
      {wizardStatusLabel(status)}
    </Badge>
  )
}

export default function AdminApplicationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ total: 0, pending: 0, draft: 0 })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('limit', 'all')

      const res = await axios.get(`/api/admin/wizard-applications?${params}`)
      const list: ApplicationRow[] = res.data?.data?.applications ?? []
      setApplications(list)
      setCounts({
        total: list.length,
        pending: list.filter((a) => a.status === 'PENDING').length,
        draft: list.filter((a) => a.status === 'DRAFT').length,
      })
    } catch (error: any) {
      setApplications([])
      toast({
        title: 'Failed to load applications',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, debouncedSearch, toast])

  useEffect(() => {
    void fetchApplications()
  }, [fetchApplications])

  return (
    <AdminPageTemplate
      title="Applications"
      description="Client wizard applications — drafts in progress and submitted forms waiting for review."
      icon={<FileText className="h-5 w-5" />}
      showConstruction={false}
      requiredPermission="applications.view"
      fullWidth
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-amber-700">{counts.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Client in progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.draft}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search client, wizard, number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="DRAFT">In progress</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">Under review</SelectItem>
              <SelectItem value="HARD_COPY_REQUIRED">Hard copy required</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Wizard</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No wizard applications yet.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{app.client.name}</p>
                        <p className="text-xs text-muted-foreground">{app.client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{app.wizard.name}</p>
                        <p className="text-xs text-muted-foreground">{app.applicationNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{app.areaOfInterest}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Step {app.progress.currentStepIndex + 1} · {app.progress.completedSteps}/
                      {app.progress.totalSteps} filled
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/applications/${app.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminPageTemplate>
  )
}
