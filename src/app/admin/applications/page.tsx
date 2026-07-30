'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { wizardStatusClasses, wizardStatusLabel } from '@/lib/wizards/wizard-status'
import { areaOfInterestDisplayLabel } from '@/components/admin/forms/types'

const PAGE_SIZE = 10

type PendingApproval = {
  wizardStepId: string
  stepIndex: number
  stepNumber: number
  formName: string
}

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
  pendingApprovals?: PendingApproval[]
  hasPendingApproval?: boolean
  pendingApprovalCount?: number
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('border', wizardStatusClasses(status))}>
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
  const [page, setPage] = useState(1)
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    draft: 0,
    stepApprovalPending: 0,
  })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

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
        stepApprovalPending: list.filter((a) => a.hasPendingApproval).length,
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

  const totalPages = Math.max(1, Math.ceil(applications.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => applications.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [applications, safePage]
  )

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.total}</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200/80 bg-sky-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-sky-800 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Step approval pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-sky-800">{counts.stepApprovalPending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Submitted pending</CardTitle>
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

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <CardTitle>Applications</CardTitle>
                <CardDescription className="mt-0.5">
                  {loading
                    ? 'Loading…'
                    : applications.length === 0
                      ? debouncedSearch || statusFilter !== 'all'
                        ? 'No results found'
                        : 'No applications yet'
                      : `${applications.length} application${applications.length === 1 ? '' : 's'}${debouncedSearch ? ' found' : ''}. Review drafts, submissions, and step approvals.`}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="relative sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search applications…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className={cn(
                      'w-full sm:w-[180px] h-9 shadow-xs transition-[color,box-shadow] outline-none',
                      'focus:ring-0 focus:ring-offset-0',
                      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
                    )}
                  >
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
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                {debouncedSearch || statusFilter !== 'all'
                  ? 'No applications match your search.'
                  : 'No wizard applications yet.'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Steps</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Step approval</TableHead>
                      <TableHead className="w-28">Updated</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((app) => (
                      <TableRow
                        key={app.id}
                        className={cn(
                          'hover:bg-muted/30',
                          app.hasPendingApproval && 'bg-sky-50/50 hover:bg-sky-50/80'
                        )}
                      >
                        <TableCell className="font-medium max-w-48">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="truncate block">{app.client.name}</span>
                            <span className="text-xs text-muted-foreground font-normal truncate">
                              {app.client.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-52">
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium truncate">{app.wizard.name}</span>
                              {app.hasPendingApproval && (
                                <Badge className="w-fit text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                                  Review
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {app.applicationNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className='text-sm'>
                            {app.areaOfInterest} ·{' '}
                            {areaOfInterestDisplayLabel(app.areaOfInterest)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {app.progress.completedSteps}/{app.progress.totalSteps} step
                            {app.progress.totalSteps === 1 ? '' : 's'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell>
                          {app.hasPendingApproval && app.pendingApprovals?.length ? (
                            <Badge className="bg-sky-100 text-sky-900 border-sky-200">
                              {/* <ShieldCheck className="h-3 w-3 mr-1" /> */}
                              {app.pendingApprovalCount === 1
                                ? `Step ${app.pendingApprovals[0].stepNumber} - pending`
                                : `${app.pendingApprovalCount} steps pending`}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(app.updatedAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 border"
                              onClick={() => router.push(`/admin/applications/${app.id}`)}
                              aria-label={
                                app.hasPendingApproval ? 'Review application' : 'View application'
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {applications.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t pt-4 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Page {safePage} of {totalPages} &mdash; {applications.length} record
                      {applications.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={p}
                          type="button"
                          variant={p === safePage ? 'default' : 'outline'}
                          size="icon"
                          className={`h-8 w-8 text-xs ${
                            p === safePage
                              ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-700'
                              : ''
                          }`}
                          onClick={() => setPage(p)}
                          aria-label={`Page ${p}`}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
