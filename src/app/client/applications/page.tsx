'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('border hover:opacity-100', wizardStatusClasses(status))}>
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
  const router = useRouter()
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
    const timer = setInterval(() => {
      void fetchApplications(true)
    }, 12000)
    return () => clearInterval(timer)
  }, [authLoading, user, fetchApplications])

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
      router.push(`/client/applications/${appId}`)
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
        <div className="max-w-5xl mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'new' | 'applied')}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2 h-auto p-1.5 gap-1.5 bg-slate-100 dark:bg-muted/40 rounded-xl">
              <TabsTrigger
                value="new"
                className={cn(
                  'gap-1.5 py-2.5 rounded-lg font-medium transition-all',
                  'data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md',
                  'data-[state=inactive]:bg-white data-[state=inactive]:text-emerald-800 dark:data-[state=inactive]:bg-card'
                )}
              >
                <Plus className="h-4 w-4" />
                New application
              </TabsTrigger>
              <TabsTrigger
                value="applied"
                className={cn(
                  'gap-1.5 py-2.5 rounded-lg font-medium transition-all',
                  'data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md',
                  'data-[state=inactive]:bg-white data-[state=inactive]:text-sky-800 dark:data-[state=inactive]:bg-card'
                )}
              >
                <ListChecks className="h-4 w-4" />
                Applied applications
                {applications.length > 0 && (
                  <Badge
                    className={cn(
                      'ml-1 text-[10px] h-5 px-1.5 border-0',
                      activeTab === 'applied'
                        ? 'bg-white/25 text-white'
                        : 'bg-sky-100 text-sky-800'
                    )}
                  >
                    {applications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Start a new application</CardTitle>
                  <CardDescription>
                    Choose your area of interest — we&apos;ll open the active application wizard
                    for that service right away.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
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
                            'group relative rounded-xl border bg-white dark:bg-card p-4 text-left transition-all',
                            'hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                            isLaunching && 'border-emerald-500 ring-2 ring-emerald-500/30',
                            launch && !isLaunching && 'opacity-60 pointer-events-none'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">{option.label}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {option.key}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {option.description}
                          </p>
                          <p className="mt-3 text-xs font-medium text-emerald-700 group-hover:text-emerald-800">
                            {draft ? 'Continue draft →' : 'Start application →'}
                          </p>
                          {draft && (
                            <Badge className="mt-2 text-[10px] bg-amber-100 text-amber-900 border-amber-200 w-fit">
                              Draft in progress
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="applied" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Applied applications</CardTitle>
                  <CardDescription>
                    Every application you started or submitted — with live status and admin updates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingApps ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="text-center py-10 space-y-3">
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
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Application</TableHead>
                            <TableHead>Area</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Admin update</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((app) => (
                            <TableRow key={app.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{app.wizard.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {app.applicationNumber}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{app.areaOfInterest}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {app.progress.completedSteps}/{app.progress.totalSteps} steps
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={app.status} />
                              </TableCell>
                              <TableCell className="max-w-[220px]">
                                {app.adminNotes ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="rounded-sm bg-amber-100 border border-amber-200/80 px-2 py-1.5 shadow-sm text-xs text-amber-950 truncate cursor-default max-w-[200px]">
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
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  className={
                                    app.status === 'DRAFT'
                                      ? 'bg-emerald-700 hover:bg-emerald-800'
                                      : undefined
                                  }
                                  variant={app.status === 'DRAFT' ? 'default' : 'outline'}
                                  onClick={() => router.push(`/client/applications/${app.id}`)}
                                >
                                  {app.status === 'DRAFT' ? 'Continue' : 'View'}
                                  <ArrowRight className="h-4 w-4 ml-1.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
