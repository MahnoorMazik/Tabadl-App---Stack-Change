'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { wizardStatusClasses, wizardStatusLabel } from '@/lib/wizards/wizard-status'
import { ApplicationLaunchOverlay } from '@/components/client/ApplicationLaunchOverlay'

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

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('border hover:opacity-100 px-2 py-0.5 font-medium rounded-md', wizardStatusClasses(status))}>
      {status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
      {(status === 'APPROVED' || status === 'COMPLETED') && (
        <CheckCircle className="h-3 w-3 mr-1" />
      )}
      {status === 'REJECTED' && <AlertCircle className="h-3 w-3 mr-1" />}
      {status === 'DRAFT' && <FileText className="h-3 w-3 mr-1" />}
      {status === 'HARD_COPY_REQUIRED' && <FileText className="h-3 w-3 mr-1" />}
      {wizardStatusLabel(status)}
    </Badge>
  )
}

export default function ClientApplicationsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
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
          title: 'Could not load applications',
          description: typeof message === 'string' ? message : 'Please sign in as a client and try again.',
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) setLoadingApps(false)
    }
  }, [toast])

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

  const beginApplication = async (area: AreaOfInterestKey, label: string) => {
    if (launch) return

    const draft = draftForArea(area)
    setLaunch({ area, label, continuing: Boolean(draft) })

    const minWait = new Promise((resolve) => setTimeout(resolve, LAUNCH_MIN_MS))

    try {
      let appId: string

      if (draft) {
        appId = draft.id
      } else {
        const check = await axios.get(`/api/client/wizards?areaOfInterest=${area}`)
        const flow = check.data?.data?.merged
        if (!flow?.totalSteps) {
          toast({
            title: 'No application available',
            description: `There is no active form for ${label} yet. Please check back later.`,
            variant: 'destructive',
          })
          setLaunch(null)
          return
        }

        const res = await axios.post('/api/client/wizard-applications', { areaOfInterest: area })
        const app = res.data?.data?.application
        if (!app?.id) {
          throw new Error('Could not start application')
        }
        appId = app.id
      }

      await minWait
      window.open(`/client/applications/${appId}`, '_blank', 'noopener,noreferrer')
      setLaunch(null)
    } catch (error: any) {
      toast({
        title: 'Could not open application',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
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
      title="Applications"
      description="Start a new application or track ones you already applied"
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
            <TabsList className="gap-3 flex justify-end ml-auto h-auto bg-transparent p-0 rounded-none shadow-none">
              <TabsTrigger
                value="new"
                className={cn(
                  'gap-2 px-4 py-2.5 rounded-md text-sm font-medium w-auto flex-none border shadow-none',
                  'transition-[color,background-color,border-color] duration-200 ease-out cursor-pointer',
                  'data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-800',
                  'data-[state=active]:border-emerald-700 data-[state=active]:shadow-none',
                  'data-[state=inactive]:bg-white data-[state=inactive]:text-foreground',
                  'data-[state=inactive]:border-gray-300',
                  'dark:data-[state=inactive]:bg-card dark:data-[state=inactive]:border-border'
                )}
              >
                <FileText className="h-4 w-4" />
                New application
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
                  'dark:data-[state=inactive]:bg-card dark:data-[state=inactive]:border-border'
                )}
              >
                <ListChecks className="h-4 w-4" />
                Applied applications
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
                  <CardTitle className="text-lg font-semibold">Start a new application</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Choose your area of interest — we&apos;ll open the active application wizard
                    for that service right away.
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
                          onClick={() => void beginApplication(option.key, option.label)}
                          className={cn(
                            'group relative flex justify-start flex-col rounded-xl border bg-white dark:bg-card p-4 text-left transition-all cursor-pointer hover:border-primary/30 hover:bg-primary/10',
                            'hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                            isLaunching && 'border-emerald-500 ring-2 ring-emerald-500/30',
                            launch && !isLaunching && 'opacity-60 pointer-events-none'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-base">{option.label}</span>

                            <div className="flex items-center gap-2">
                              {draft && (
                                <Badge className="text-[12px] bg-amber-100 text-amber-900 border-amber-200 w-fit">
                                  Draft in progress
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[12px] bg-gray-100 border-gray-300">
                                {option.key}
                              </Badge>
                            </div>

                          </div>
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {option.description}
                          </p>
                          <p className="mt-2 text-sm font-medium text-emerald-700 group-hover:text-emerald-800">
                            {draft ? 'Continue draft →' : 'Start application →'}
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle>Applied applications</CardTitle>
                      <CardDescription className="mt-0.5">
                        {loadingApps
                          ? 'Loading…'
                          : filteredApplications.length === 0
                            ? search
                              ? 'No results found'
                              : 'No applications yet'
                            : `${filteredApplications.length} application${filteredApplications.length === 1 ? '' : 's'}${search ? ' found' : ''}. Track status and continue drafts anytime.`}
                      </CardDescription>
                    </div>
                    <div className="relative sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search applications…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
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
                      <p className="text-sm text-muted-foreground">
                        No applications yet. Start one from the New application tab.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('new')}
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Start new application
                      </Button>
                    </div>
                  ) : filteredApplications.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      No applications match your search.
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Application</TableHead>
                            <TableHead>Area</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Admin update</TableHead>
                            <TableHead className="w-28">Updated</TableHead>
                            <TableHead className="w-28 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedApplications.map((app) => {
                            const isDraft = app.status === 'DRAFT'
                            return (
                              <TableRow key={app.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium max-w-52">
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <span className="truncate block">{app.wizard.name}</span>
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
                                    step{app.progress.totalSteps === 1 ? '' : 's'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={app.status} />
                                </TableCell>
                                <TableCell className="max-w-[220px]">
                                  {app.adminNotes ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="rounded-md bg-amber-100 border border-amber-200/80 px-2 py-1.5 shadow-sm text-xs text-amber-950 truncate cursor-default max-w-[200px]">
                                          {app.adminNotes}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-xs whitespace-pre-wrap break-words bg-amber-50 text-amber-950 border border-amber-200"
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
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
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
                                      aria-label={isDraft ? 'Continue application' : 'View application'}
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
                        <div className="flex items-center justify-between border-t pt-4 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Page {safePage} of {totalPages} &mdash;{' '}
                            {filteredApplications.length} record
                            {filteredApplications.length === 1 ? '' : 's'}
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
            </TabsContent>
          </Tabs>
        </div>
      )}
    </MobileLayout>
  )
}
