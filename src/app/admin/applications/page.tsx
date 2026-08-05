'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
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
  Loader2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { wizardStatusClasses, wizardStatusLabel } from '@/lib/wizards/wizard-status'
import { areaOfInterestDisplayLabel } from '@/components/admin/forms/types'
import { StartApplicationForClientModal } from '@/components/admin/applications/StartApplicationForClientModal'

import { useLocale } from '@/contexts/LocaleContext'

export const dynamic = 'force-dynamic'

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
  const { t } = useLocale()
  
  const getStatusLabel = (st: string) => {
    switch (st.toUpperCase()) {
      case 'DRAFT':
        return t('admin.applications.status.inProgress')
      case 'PENDING':
        return t('admin.applications.status.pending')
      case 'IN_PROGRESS':
        return t('admin.applications.status.underReview')
      case 'HARD_COPY_REQUIRED':
        return t('admin.applications.status.hardCopyRequired')
      case 'APPROVED':
        return t('admin.applications.status.approved')
      case 'REJECTED':
        return t('admin.applications.status.rejected')
      case 'COMPLETED':
        return t('admin.applications.status.completed')
      default:
        return wizardStatusLabel(st)
    }
  }

  return (
    <Badge variant="outline" className={cn('border', wizardStatusClasses(status))}>
      {getStatusLabel(status)}
    </Badge>
  )
}

export default function AdminApplicationsPage() {
  const { toast } = useToast()
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'

  const getAreaLabel = (area: string) => {
    switch (area) {
      case 'CR':
        return t('admin.wizards.areaOption.cr')
      case 'PR':
        return t('admin.wizards.areaOption.pr')
      default:
        return area
    }
  }

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
  const [startForClientOpen, setStartForClientOpen] = useState(false)

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
      title={t('admin.applications.title')}
      description={t('admin.applications.subtitle')}
      icon={<FileText className="h-5 w-5" />}
      showConstruction={false}
      requiredPermission="applications.view"
      fullWidth
    >
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-sm font-medium text-muted-foreground", isRTL ? "text-right" : "text-left")}>
                {t('admin.applications.card.total')}
              </CardTitle>
            </CardHeader>
            <CardContent className={isRTL ? "text-right" : "text-left"}>
              <p className="text-2xl font-semibold">{counts.total}</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200/80 bg-sky-50/40">
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-sm font-medium text-sky-800 flex items-center gap-1.5", isRTL ? "flex-row-reverse justify-end text-right" : "text-left")}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('admin.applications.card.stepApprovalPending')}
              </CardTitle>
            </CardHeader>
            <CardContent className={isRTL ? "text-right" : "text-left"}>
              <p className="text-2xl font-semibold text-sky-800">{counts.stepApprovalPending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-sm font-medium text-muted-foreground", isRTL ? "text-right" : "text-left")}>
                {t('admin.applications.card.submittedPending')}
              </CardTitle>
            </CardHeader>
            <CardContent className={isRTL ? "text-right" : "text-left"}>
              <p className="text-2xl font-semibold text-amber-700">{counts.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-sm font-medium text-muted-foreground", isRTL ? "text-right" : "text-left")}>
                {t('admin.applications.card.clientInProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent className={isRTL ? "text-right" : "text-left"}>
              <p className="text-2xl font-semibold">{counts.draft}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className={cn("flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3", isRTL ? "lg:flex-row-reverse" : "lg:flex-row")}>
              <div className={isRTL ? "text-right" : "text-left"}>
                <CardTitle>{t('admin.applications.heading')}</CardTitle>
                <CardDescription className={cn("mt-0.5", isRTL ? "text-right" : "text-left")}>
                  {loading
                    ? t('admin.wizards.loading')
                    : applications.length === 0
                      ? debouncedSearch || statusFilter !== 'all'
                        ? t('admin.applications.noMatch')
                        : t('admin.applications.noApplicationsYet')
                      : `${applications.length} ${t('admin.applications.applications')}${debouncedSearch ? ` ${t('admin.wizards.foundSuffix')}` : ''}. ${t('admin.applications.headingSub')}`}
                </CardDescription>
              </div>
              <div className={cn("flex flex-col sm:flex-row gap-2 sm:items-center", isRTL ? "sm:flex-row-reverse" : "sm:flex-row")}>
                <Button
                  type="button"
                  className="bg-emerald-700 hover:bg-emerald-800 h-9 cursor-pointer"
                  onClick={() => setStartForClientOpen(true)}
                >
                  <UserPlus className={cn("h-4 w-4", isRTL ? "ml-1.5" : "mr-1.5")} />
                  {t('admin.applications.startForClient')}
                </Button>
                <div className="relative sm:w-64">
                  <Search className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none", isRTL ? "right-2.5" : "left-2.5")} />
                  <Input
                    placeholder={t('admin.applications.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn("h-9 text-sm", isRTL ? "pr-8 text-right" : "pl-8 text-left")}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className={cn(
                      'w-full sm:w-[180px] h-9 shadow-xs transition-[color,box-shadow] outline-none',
                      'focus:ring-0 focus:ring-offset-0',
                      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                      isRTL ? "text-right" : "text-left"
                    )}
                  >
                    <SelectValue placeholder={t('admin.applications.status.all')} />
                  </SelectTrigger>
                  <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                    <SelectItem value="all">{t('admin.applications.status.all')}</SelectItem>
                    <SelectItem value="DRAFT">{t('admin.applications.status.inProgress')}</SelectItem>
                    <SelectItem value="PENDING">{t('admin.applications.status.pending')}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t('admin.applications.status.underReview')}</SelectItem>
                    <SelectItem value="HARD_COPY_REQUIRED">{t('admin.applications.status.hardCopyRequired')}</SelectItem>
                    <SelectItem value="APPROVED">{t('admin.applications.status.approved')}</SelectItem>
                    <SelectItem value="REJECTED">{t('admin.applications.status.rejected')}</SelectItem>
                    <SelectItem value="COMPLETED">{t('admin.applications.status.completed')}</SelectItem>
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
              <div className={cn("rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground", isRTL ? "text-right" : "text-left")}>
                {debouncedSearch || statusFilter !== 'all'
                  ? t('admin.applications.noMatch')
                  : t('admin.applications.noApplicationsYet')}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.applications.table.client')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.applications.table.application')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.applications.table.service')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.applications.table.steps')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.applications.table.status')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.applications.table.stepApproval')}</TableHead>
                      <TableHead className={cn("w-28", isRTL ? "text-right" : "text-left")}>{t('admin.applications.table.updated')}</TableHead>
                      <TableHead className={cn("w-24", isRTL ? "text-left" : "text-right")}>{t('admin.applications.table.actions')}</TableHead>
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
                        <TableCell className={cn("font-medium max-w-48", isRTL ? "text-right" : "text-left")}>
                          <div className={cn("flex flex-col gap-0.5 min-w-0", isRTL ? "text-right" : "text-left")}>
                            <span className="truncate block">{app.client.name}</span>
                            <span className="text-xs text-muted-foreground font-normal truncate">
                              {app.client.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={cn("max-w-52", isRTL ? "text-right" : "text-left")}>
                          <div className={cn("flex flex-col gap-1 min-w-0", isRTL ? "text-right" : "text-left")}>
                            <div className={cn("flex flex-wrap items-center gap-2", isRTL ? "flex-row-reverse justify-end" : "flex-row")}>
                              <span className="font-medium truncate">{app.wizard.name}</span>
                              {app.hasPendingApproval && (
                                <Badge className="w-fit text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                                  {t('admin.applications.badge.review')}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {app.applicationNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                          <span className="text-sm">
                            {app.areaOfInterest} · {getAreaLabel(app.areaOfInterest)}
                          </span>
                        </TableCell>
                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {app.progress.completedSteps}/{app.progress.totalSteps}{' '}
                            {app.progress.totalSteps === 1 ? t('admin.wizards.stepSingular') : t('admin.wizards.stepPlural')}
                          </span>
                        </TableCell>
                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                          {app.hasPendingApproval && app.pendingApprovals?.length ? (
                            <div className={cn("flex flex-col gap-1", isRTL ? "items-end" : "items-start")}>
                              {app.pendingApprovals.slice(0, 2).map((pending) => (
                                <Badge
                                  key={pending.wizardStepId}
                                  className="w-fit bg-sky-100 text-sky-900 border-sky-200 hover:bg-sky-100"
                                >
                                  {t('admin.wizards.stepSingular')} {pending.stepNumber} · {t('admin.applications.badge.pending')}
                                </Badge>
                              ))}
                              {(app.pendingApprovalCount ?? 0) > 2 && (
                                <span className="text-[11px] text-sky-800">
                                  +{(app.pendingApprovalCount ?? 0) - 2} {t('admin.wizards.recordPlural')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(app.updatedAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className={isRTL ? "text-left" : "text-right"}>
                          <div className={cn("flex items-center gap-1", isRTL ? "justify-start" : "justify-end")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 border cursor-pointer"
                              onClick={() =>
                                window.open(
                                  `/admin/applications/${app.id}`,
                                  '_blank',
                                  'noopener,noreferrer'
                                )
                              }
                              aria-label={
                                app.hasPendingApproval ? 'Review application' : 'View application'
                              }
                            >
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">Edit application</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {applications.length > PAGE_SIZE && (
                  <div className={cn("flex items-center justify-between border-t pt-4 mt-2", isRTL ? "flex-row-reverse" : "flex-row")}>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.wizards.pageOf').replace('{page}', String(safePage)).replace('{totalPages}', String(totalPages))} &mdash; {applications.length} {applications.length === 1 ? t('admin.wizards.recordSingular') : t('admin.wizards.recordPlural')}
                    </p>
                    <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        aria-label={t('admin.wizards.previousPage')}
                      >
                        {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={p}
                          type="button"
                          variant={p === safePage ? 'default' : 'outline'}
                          size="icon"
                          className={`h-8 w-8 text-xs cursor-pointer ${
                            p === safePage
                              ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-700'
                              : ''
                          }`}
                          onClick={() => setPage(p)}
                          aria-label={t('admin.wizards.pageLabel').replace('{page}', String(p))}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        aria-label={t('admin.wizards.nextPage')}
                      >
                        {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <StartApplicationForClientModal
        open={startForClientOpen}
        onOpenChange={setStartForClientOpen}
        onStarted={() => {
          void fetchApplications()
        }}
      />
    </AdminPageTemplate>
  )
}
