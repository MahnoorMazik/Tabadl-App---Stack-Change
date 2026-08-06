'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AREA_OF_INTEREST_OPTIONS,
  AreaOfInterestKey,
  areaOfInterestDisplayLabel,
} from '@/components/admin/forms/types'
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  ArrowRight,
  Plus,
  ListChecks,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { cn } from '@/lib/utils'
import { wizardStatusClasses } from '@/lib/wizards/wizard-status'
import { ApplicationLaunchOverlay } from '@/components/client/ApplicationLaunchOverlay'
import { useLocale } from '@/contexts/LocaleContext'
import { getLocalizedText } from '@/lib/multilingual-text'

type ApplicationItem = {
  id: string
  applicationNumber: string
  status: string
  areaOfInterest: string
  submittedAt: string | null
  updatedAt: string
  adminNotes?: string | null
  wizard: { id: string; name: string; areaOfInterest: string }
  progress: { totalSteps: number; completedSteps: number; currentStepIndex: number }
}

const LAUNCH_MIN_MS = 1400
const PAGE_SIZE = 10

function StatusBadge({ status, label, isRTL }: { status: string; label: string; isRTL: boolean }) {
  return (
    <Badge
      className={cn(
        'border hover:opacity-100 px-2 py-0.5 font-medium rounded-md inline-flex items-center',
        wizardStatusClasses(status),
        isRTL ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {status === 'PENDING' && <Clock className={cn('h-3 w-3 shrink-0', isRTL ? 'ml-1' : 'mr-1')} />}
      {(status === 'APPROVED' || status === 'COMPLETED') && (
        <CheckCircle className={cn('h-3 w-3 shrink-0', isRTL ? 'ml-1' : 'mr-1')} />
      )}
      {status === 'REJECTED' && <AlertCircle className={cn('h-3 w-3 shrink-0', isRTL ? 'ml-1' : 'mr-1')} />}
      {status === 'DRAFT' && <FileText className={cn('h-3 w-3 shrink-0', isRTL ? 'ml-1' : 'mr-1')} />}
      {status === 'HARD_COPY_REQUIRED' && <FileText className={cn('h-3 w-3 shrink-0', isRTL ? 'ml-1' : 'mr-1')} />}
      {label}
    </Badge>
  )
}

export default function ClientApplicationsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'
  const {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    toggleMobileSidebar,
    toggleDesktopSidebar,
    closeMobileSidebar,
  } = useMobileSidebar()
  const [activeTab, setActiveTab] = useState<'new' | 'applied'>('new')
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [launch, setLaunch] = useState<{
    area: AreaOfInterestKey
    label: string
    continuing: boolean
  } | null>(null)
  /** Sync lock so double-clicks cannot start two creates before React state updates. */
  const launchLockRef = useRef(false)

  const fetchApplications = useCallback(async (silent = false) => {
    if (!silent) setLoadingApps(true)
    try {
      const res = await axios.get('/api/client/wizard-applications')
      setApplications(res.data?.data?.applications ?? [])
    } catch (error: any) {
      if (!silent) {
        setApplications([])
        const message =
          error.response?.data?.error?.message ||
          error.response?.data?.error ||
          'Failed to load applications'
        toast({
          title: t('client.applications.toast.couldNotLoadTitle'),
          description: typeof message === 'string' ? message : t('client.applications.toast.couldNotLoadDesc'),
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) setLoadingApps(false)
    }
  }, [t, toast])

  useEffect(() => {
    if (!authLoading && user) void fetchApplications()
  }, [authLoading, user, fetchApplications])

  useEffect(() => {
    if (authLoading || !user) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchApplications(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [authLoading, user, fetchApplications])

  useEffect(() => {
    setPage(1)
  }, [search])

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return applications
    return applications.filter((app) => {
      const areaLabel = areaOfInterestDisplayLabel(app.areaOfInterest).toLowerCase()
      return (
        app.wizard.name.toLowerCase().includes(q) ||
        app.applicationNumber.toLowerCase().includes(q) ||
        app.areaOfInterest.toLowerCase().includes(q) ||
        areaLabel.includes(q) ||
        app.status.toLowerCase().includes(q) ||
        (app.adminNotes?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [applications, search])

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedApplications = filteredApplications.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const draftForArea = (area: AreaOfInterestKey) =>
    applications.find((a) => a.areaOfInterest === area && a.status === 'DRAFT')

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return t('client.applications.status.draft')
      case 'PENDING':
        return t('client.applications.status.pending')
      case 'IN_PROGRESS':
        return t('client.applications.status.inProgress')
      case 'HARD_COPY_REQUIRED':
        return t('client.applications.status.hardCopyRequired')
      case 'APPROVED':
        return t('client.applications.status.approved')
      case 'REJECTED':
        return t('client.applications.status.rejected')
      case 'COMPLETED':
        return t('client.applications.status.completed')
      default:
        return status
    }
  }

  const getAreaLabel = (area: AreaOfInterestKey) => {
    switch (area) {
      case 'CR':
        return t('client.applications.area.cr.label')
      case 'PR':
        return t('client.applications.area.pr.label')
      default:
        return area
    }
  }

  const getAreaDescription = (area: AreaOfInterestKey) => {
    switch (area) {
      case 'CR':
        return t('client.applications.area.cr.description')
      case 'PR':
        return t('client.applications.area.pr.description')
      default:
        return ''
    }
  }

  const beginApplication = async (area: AreaOfInterestKey, label: string) => {
    if (launchLockRef.current || launch) return
    launchLockRef.current = true

    const draft = draftForArea(area)
    setLaunch({ area, label, continuing: Boolean(draft) })

    // Open tab synchronously on user click — async window.open is blocked by browsers.
    const popup = window.open('about:blank', '_blank')
    if (popup) {
      try {
        popup.document.title = t('client.applications.pageTitle')
        popup.document.body.innerHTML =
          '<div style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#047857;">Loading application…</div>'
      } catch {
        // Cross-origin / restricted about:blank — still usable via location.href
      }
    }

    const minWait = new Promise((resolve) => setTimeout(resolve, LAUNCH_MIN_MS))

    try {
      let appId: string
      let resumed = Boolean(draft)

      if (draft) {
        appId = draft.id
      } else {
        const check = await axios.get(`/api/client/wizards?areaOfInterest=${area}`)
        const flow = check.data?.data?.merged
        if (!flow?.totalSteps) {
          popup?.close()
          toast({
            title: t('client.applications.toast.noAppTitle'),
            description: t('client.applications.toast.noAppDesc').replace('{label}', label),
            variant: 'destructive',
          })
          return
        }

        // Always go through API — it resumes an existing DRAFT for this area (no duplicate).
        const res = await axios.post('/api/client/wizard-applications', { areaOfInterest: area })
        const app = res.data?.data?.application
        if (!app?.id) {
          throw new Error('Could not start application')
        }
        appId = app.id
        resumed = Boolean(res.data?.data?.resumed)

        // Optimistically mark draft in local list so the behind-tab UI shows Continue immediately.
        setApplications((prev) => {
          if (prev.some((a) => a.id === app.id)) return prev
          return [
            {
              id: app.id,
              applicationNumber: app.applicationNumber ?? '',
              status: app.status ?? 'DRAFT',
              areaOfInterest: app.areaOfInterest ?? area,
              submittedAt: app.submittedAt ?? null,
              updatedAt: app.updatedAt ?? new Date().toISOString(),
              adminNotes: app.adminNotes ?? null,
              wizard: app.wizard ?? {
                id: app.wizardId ?? '',
                name: label,
                areaOfInterest: area,
              },
              progress: app.progress ?? {
                totalSteps: flow.totalSteps,
                completedSteps: 0,
                currentStepIndex: 0,
              },
            },
            ...prev,
          ]
        })
      }

      await minWait
      const appUrl = `/client/applications/${appId}`

      if (popup && !popup.closed) {
        popup.location.href = appUrl
      } else {
        // Popup blocked — open in this tab so the user is not stuck on draft-only.
        window.location.href = appUrl
        return
      }

      if (resumed && !draft) {
        toast({
          title: t('client.applications.toast.openingDraftTitle'),
          description: t('client.applications.toast.openingDraftDesc').replace('{label}', label),
        })
      }

      // Sync list so the original tab shows Continue / draft badge without waiting for focus.
      void fetchApplications(true)
    } catch (error: any) {
      popup?.close()
      toast({
        title: t('client.applications.toast.couldNotOpenTitle'),
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      launchLockRef.current = false
      setLaunch(null)
    }
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title={t('client.applications.pageTitle')}
      description={t('client.applications.pageDescription')}
      icon={<ClipboardList className="h-5 w-5 text-emerald-600" />}
    >
      <ApplicationLaunchOverlay
        open={Boolean(launch)}
        areaLabel={launch?.label}
        mode={launch?.continuing ? 'continue' : 'start'}
      />

      {authLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'new' | 'applied')}
            className="space-y-4"
          >
            <TabsList className={cn('gap-3 flex h-auto bg-transparent p-0 rounded-none shadow-none', isRTL ? 'mr-auto flex-row-reverse' : 'ml-auto')}>
              <TabsTrigger
                value="new"
                className={cn(
                  'gap-2 px-4 py-2.5 rounded-md text-sm font-medium w-auto flex-none border shadow-none',
                  'transition-[color,background-color,border-color] duration-200 ease-out cursor-pointer',
                  'data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-800',
                  'data-[state=active]:border-emerald-700 data-[state=active]:shadow-none',
                  'data-[state=inactive]:bg-white data-[state=inactive]:text-foreground',
                  'data-[state=inactive]:border-gray-300',
                  'dark:data-[state=inactive]:bg-card dark:data-[state=inactive]:border-border',
                  isRTL ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <FileText className="h-4 w-4" />
                {t('client.applications.newTab')}
              </TabsTrigger>
              <TabsTrigger
                value="applied"
                className={cn(
                  'gap-2 px-4 py-2.5 rounded-md text-sm font-medium w-auto flex-none border shadow-none',
                  'transition-[color,background-color,border-color] duration-200 ease-out cursor-pointer',
                  'data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-800',
                  'data-[state=active]:border-emerald-700 data-[state=active]:shadow-none',
                  'data-[state=inactive]:bg-white data-[state=inactive]:text-foreground',
                  'data-[state=inactive]:border-gray-300',
                  'dark:data-[state=inactive]:bg-card dark:data-[state=inactive]:border-border',
                  isRTL ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <ListChecks className="h-4 w-4" />
                {t('client.applications.appliedTab')}
                {applications.length > 0 && (
                  <Badge
                    className={cn(
                      'text-[11px] h-5 min-w-5 px-1.5 justify-center border transition-colors duration-200 ease-out',
                      activeTab === 'applied'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-500'
                        : 'bg-gray-100 border-gray-300 text-gray-700'
                    )}
                  >
                    {applications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="new"
              forceMount
              className={cn(
                'mt-0 outline-none transition-opacity duration-200 ease-out',
                'data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0'
              )}
            >
              <Card>
                <CardHeader>
                  <CardTitle className={cn('text-lg font-semibold', isRTL ? 'text-right' : 'text-left')}>
                    {t('client.applications.newCardTitle')}
                  </CardTitle>
                  <CardDescription className={cn('text-muted-foreground text-sm', isRTL ? 'text-right' : 'text-left')}>
                    {t('client.applications.newCardDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {AREA_OF_INTEREST_OPTIONS.map((option) => {
                      const draft = draftForArea(option.key)
                      const isLaunching = launch?.area === option.key
                      return (
                        <button
                          key={option.key}
                          type="button"
                          disabled={Boolean(launch)}
                          onClick={() => void beginApplication(option.key, getAreaLabel(option.key))}
                          className={cn(
                            'group relative flex justify-start flex-col rounded-xl border bg-white dark:bg-card p-4 transition-all cursor-pointer hover:border-primary/30 hover:bg-primary/10',
                            'hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                            isLaunching && 'border-emerald-500 ring-2 ring-emerald-500/30',
                            launch && !isLaunching && 'opacity-60 pointer-events-none',
                            isRTL ? 'text-right' : 'text-left'
                          )}
                        >
                          <div className={cn('flex items-center gap-2 mb-2', isRTL ? 'justify-between flex-row-reverse' : 'justify-between flex-row')}>
                            <span className="font-semibold text-base flex-1">{getAreaLabel(option.key)}</span>

                            <div className={cn('flex items-center gap-2 shrink-0', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                              {draft && (
                                <Badge className="text-[12px] bg-amber-100 text-amber-900 border-amber-200 w-fit">
                                  {t('client.applications.draftBadge')}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[12px] bg-gray-100 border-gray-300">
                                {option.key}
                              </Badge>
                            </div>

                          </div>
                          <p className={cn('text-sm text-muted-foreground leading-relaxed', isRTL ? 'text-right' : 'text-left')}>
                            {getAreaDescription(option.key)}
                          </p>
                          <p className={cn('mt-3 text-sm font-medium text-emerald-700 group-hover:text-emerald-800', isRTL ? 'text-right' : 'text-left')}>
                            {draft ? `${t('client.applications.continueDraft')} ${isRTL ? '←' : '→'}` : `${t('client.applications.startApplication')} ${isRTL ? '←' : '→'}`}
                          </p>
                          
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="applied"
              forceMount
              className={cn(
                'mt-0 outline-none transition-opacity duration-200 ease-out',
                'data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0'
              )}
            >
              <Card>
                <CardHeader>
                  <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3', isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row')}>
                    <div className={cn(isRTL ? 'text-right' : 'text-left')}>
                      <CardTitle>{t('client.applications.appliedTab')}</CardTitle>
                      <CardDescription className={cn('mt-0.5', isRTL ? 'text-right' : 'text-left')}>
                        {loadingApps
                          ? t('client.applications.loading')
                          : filteredApplications.length === 0
                            ? search
                              ? t('client.applications.noResults')
                              : t('client.applications.noApplicationsYet')
                            : `${filteredApplications.length} ${filteredApplications.length === 1 ? t('client.applications.applicationCountSingular') : t('client.applications.applicationCountPlural')}${search ? ` ${t('client.applications.foundSuffix')}` : ''}. ${t('client.applications.trackStatus')}`}
                      </CardDescription>
                    </div>
                    <div className="relative sm:w-64">
                      <Search className={cn('absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none', isRTL ? 'right-2.5' : 'left-2.5')} />
                      <Input
                        placeholder={t('client.applications.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn('h-9 text-sm', isRTL ? 'pr-8 text-right' : 'pl-8 text-left')}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingApps ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
                      <p className={cn('text-sm text-muted-foreground', isRTL ? 'text-right' : 'text-left')}>
                        {t('client.applications.emptyStateMessage')}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('new')}
                      >
                        <Plus className={cn('h-4 w-4', isRTL ? 'ml-1.5' : 'mr-1.5')} />
                        {t('client.applications.startNewApplication')}
                      </Button>
                    </div>
                  ) : filteredApplications.length === 0 ? (
                    <div className={cn('rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground', isRTL ? 'text-right' : 'text-left')}>
                      {t('client.applications.noSearchResults')}
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('client.applications.table.application')}</TableHead>
                            <TableHead>{t('client.applications.table.area')}</TableHead>
                            <TableHead>{t('client.applications.table.progress')}</TableHead>
                            <TableHead>{t('client.applications.table.status')}</TableHead>
                            <TableHead>{t('client.applications.table.adminUpdate')}</TableHead>
                            <TableHead className="w-28">{t('client.applications.table.updated')}</TableHead>
                            <TableHead className={cn('w-28', isRTL ? 'text-left' : 'text-right')}>{t('client.applications.table.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedApplications.map((app) => {
                            const isDraft = app.status === 'DRAFT'
                            return (
                              <TableRow key={app.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium max-w-52">
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <span className="truncate block">{getLocalizedText(app.wizard.name, locale)}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                      {app.applicationNumber}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-normal">
                                    {app.areaOfInterest} ·{' '}
                                    {areaOfInterestDisplayLabel(app.areaOfInterest)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                                    {app.progress.completedSteps}/{app.progress.totalSteps}{' '}
                                    {app.progress.totalSteps === 1 ? t('client.applications.table.stepSingular') : t('client.applications.table.stepPlural')}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={app.status} label={getStatusLabel(app.status)} isRTL={isRTL} />
                                </TableCell>
                                <TableCell className="max-w-55">
                                  {app.adminNotes ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="rounded-md bg-amber-100 border border-amber-200/80 px-2 py-1.5 shadow-sm text-xs text-amber-950 truncate cursor-default max-w-50">
                                          {app.adminNotes}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-xs whitespace-pre-wrap wrap-break-word bg-amber-50 text-amber-950 border border-amber-200"
                                      >
                                        {app.adminNotes}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(app.updatedAt), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell className={cn(isRTL ? 'text-left' : 'text-right')}>
                                  <div className={cn('flex items-center gap-1', isRTL ? 'justify-start' : 'justify-end')}>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 border rounded-md text-sm font-medium cursor-pointer"
                                      onClick={() =>
                                        window.open(
                                          `/client/applications/${app.id}`,
                                          '_blank',
                                          'noopener,noreferrer'
                                        )
                                      }
                                      aria-label={isDraft ? t('client.applications.continueApplication') : t('client.applications.viewApplication')}
                                    >
                                      {isDraft ? (
                                        <ArrowRight className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>

                      {filteredApplications.length > PAGE_SIZE && (
                        <div className={cn("flex items-center justify-between border-t pt-4 mt-2", isRTL ? "flex-row-reverse" : "flex-row")}>
                          <p className={cn('text-xs text-muted-foreground', isRTL ? 'text-right' : 'text-left')}>
                            {t('client.applications.table.pageOf').replace('{page}', String(safePage)).replace('{totalPages}', String(totalPages))}{' '}
                            &mdash;{' '}
                            {filteredApplications.length}{' '}
                            {filteredApplications.length === 1 ? t('client.applications.table.record') : t('client.applications.table.records')}
                          </p>
                          <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={safePage === 1}
                              aria-label={t('client.applications.previousPage')}
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
                                aria-label={t('client.applications.pageLabel').replace('{page}', String(p))}
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
                              aria-label={t('client.applications.nextPage')}
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
            </TabsContent>
          </Tabs>
        </div>
      )}
    </MobileLayout>
  )
}
