'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ApplicationStepForm, StepField } from '@/components/client/ApplicationStepForm'
import { ApplicationStepsNav } from '@/components/wizards/ApplicationStepsNav'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Lock,
  Pin,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { cn } from '@/lib/utils'
import { wizardStatusClasses, wizardStatusLabel, isClientApplicationEditable } from '@/lib/wizards/wizard-status'
import {
  areaOfInterestDisplayLabel,
} from '@/components/admin/forms/types'
import {
  approvalAdvanceBlockedReason,
  canClientAccessStepIndex,
  findUnapprovedRequiredStepIndex,
  firstBlockingApprovalStepBefore,
  lastClientFillableStepIndex,
  maxAccessibleStepIndex,
  nextClientFillableStepIndex,
  hasPendingStepApproval,
  resolveClientStepIndexAfterUpdate,
  shouldLockClientStepByApproval,
} from '@/lib/wizards/wizard-step-approval-rules'
import { wizardApplicationDetailFingerprint } from '@/lib/wizards/wizard-application-utils'
import { buildWizardAnswersPayload } from '@/lib/wizards/wizard-file-utils'
import { WhatsAppStatus } from '@/components/admin/notifications/WhatsAppStatus'
import { useLocale } from '@/contexts/LocaleContext'

export const dynamic = 'force-dynamic'
type AppDetail = {
  id: string
  applicationNumber: string
  status: string
  areaOfInterest: string
  currentStepIndex: number
  adminNotes?: string | null
  submittedAt?: string | null
  updatedAt?: string
  wizard: { id: string; name: string }
  client: {
    id: string
    name: string
    email: string
    phone?: string | null
    clientNumber?: string | null
  }
  steps: Array<{
    id: string
    index: number
    formName: string
    paymentRequired: boolean
    approvalRequired?: boolean
    adminUseOnly?: boolean
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
    rejectionNote?: string | null
    fields: Array<{
      fieldId: string
      label: string
      type: string
      isRequired: boolean
      options?: string[] | null
      helpText?: string | null
      placeholder?: string | null
      answer: { value: string | null; fileUrl: string | null }
    }>
  }>
  progress: { totalSteps: number; completedSteps: number }
}

function getAreaLabel(area: string) {
  return areaOfInterestDisplayLabel(area)
}

function StatusBadge({ status }: { status: string }) {
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'

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
    <Badge className={cn('border hover:opacity-100', wizardStatusClasses(status), isRTL ? 'flex-row-reverse' : 'flex-row')}>
      {status === 'PENDING' && <Clock className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} />}
      {(status === 'APPROVED' || status === 'COMPLETED') && (
        <CheckCircle2 className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} />
      )}
      {status === 'REJECTED' && <AlertCircle className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} />}
      {(status === 'DRAFT' || status === 'HARD_COPY_REQUIRED') && (
        <FileText className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} />
      )}
      {getStatusLabel(status)}
    </Badge>
  )
}

export default function ClientApplicationFillPage() {
  const params = useParams()
  const id = String(params.id)
  const router = useRouter()
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
  const [app, setApp] = useState<AppDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [formDirty, setFormDirty] = useState(false)
  const [serverSyncVersion, setServerSyncVersion] = useState(0)
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [whatsappError, setWhatsappError] = useState<string>()
  const latestFormValuesRef = useRef<Record<string, string>>({})
  const appFingerprintRef = useRef<string | null>(null)
  const appRef = useRef<AppDetail | null>(null)

  const applicationLocked = app ? !isClientApplicationEditable(app.status) : false

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await axios.get(`/api/client/wizard-applications/${id}`)
        const detail = res.data?.data?.application as AppDetail
        const fingerprint = wizardApplicationDetailFingerprint(detail)
        const hadPendingApproval = appRef.current
          ? hasPendingStepApproval(appRef.current.steps)
          : false

        if (silent && fingerprint === appFingerprintRef.current) return

        appFingerprintRef.current = fingerprint
        appRef.current = detail
        setApp(detail)

        const unlockedAfterApproval =
          silent &&
          hadPendingApproval &&
          !hasPendingStepApproval(detail.steps)

        if (!silent) {
          const maxIdx = Math.max(0, detail.steps.length - 1)
          const allowedMax = maxAccessibleStepIndex(detail.steps)
          setStepIndex(
            Math.min(detail.currentStepIndex ?? 0, maxIdx, allowedMax)
          )
        } else {
          setStepIndex((prev) => {
            const allowedMax = maxAccessibleStepIndex(detail.steps)
            const fromApproval = resolveClientStepIndexAfterUpdate(detail.steps, prev)
            const fromServer = Math.min(detail.currentStepIndex ?? prev, allowedMax)
            return Math.max(fromApproval, fromServer)
          })
        }

        if (unlockedAfterApproval) {
          toast({
            title: 'Step approved',
            description: 'The next step is now open. You can continue filling the form.',
          })
        }
      } catch {
        if (!silent) {
          toast({ title: 'Application not found', variant: 'destructive' })
          router.replace('/client/applications')
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id, router, toast]
  )

  useEffect(() => {
    if (!authLoading && user) void load()
  }, [authLoading, user, load])

  useEffect(() => {
    if (authLoading || !user || !app) return

    const waitingOnApproval = hasPendingStepApproval(app.steps)
    const shouldPoll = waitingOnApproval || applicationLocked
    if (!shouldPoll) return

    const intervalMs = waitingOnApproval ? 5000 : 60000
    const timer = setInterval(() => {
      if (saving) return
      if (formDirty && !waitingOnApproval) return
      void load(true)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [authLoading, user, load, applicationLocked, formDirty, saving, app?.steps])

  useEffect(() => {
    if (authLoading || !user || !app) return
    if (!hasPendingStepApproval(app.steps)) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || saving) return
      void load(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [authLoading, user, app?.steps, load, saving])

  const currentStep = app?.steps[stepIndex]

  const isStepReadOnlyForClient = (index: number) => {
    if (!app || applicationLocked) return applicationLocked
    if (!app.steps[index]) return false
    return shouldLockClientStepByApproval(app.steps, index)
  }

  const buildAnswersPayload = (
    answers: Record<string, string>,
    fields: AppDetail['steps'][number]['fields'],
    fileNames?: Record<string, string>
  ) => buildWizardAnswersPayload(answers, fields, fileNames)

  const saveStep = async (
    answers: Record<string, string>,
    opts?: { goNext?: boolean; submit?: boolean; exit?: boolean; fileNames?: Record<string, string> }
  ) => {
    if (!app || !currentStep) return

    if (currentStep.adminUseOnly) {
      toast({
        title: 'Admin only',
        description: 'This step can only be completed by an administrator.',
        variant: 'destructive',
      })
      return
    }

    if (opts?.submit && findUnapprovedRequiredStepIndex(app.steps) !== null) {
      toast({
        title: 'Approval required',
        description: 'All admin approval steps must be approved before submitting.',
        variant: 'destructive',
      })
      return
    }

    const targetNextIndex = opts?.goNext
      ? Math.min(stepIndex + 1, app.steps.length - 1)
      : stepIndex

    if (opts?.goNext && !canClientAccessStepIndex(app.steps, targetNextIndex)) {
      const block = firstBlockingApprovalStepBefore(app.steps, targetNextIndex)
      toast({
        title: 'Next step locked',
        description:
          block !== null
            ? approvalAdvanceBlockedReason(app.steps[block])
            : 'Complete the current step first.',
        variant: 'destructive',
      })
      opts = { ...opts, goNext: false }
    }

    setSaving(true)
    setSaveIndicator('saving')
    try {
      const nextIndex = opts?.goNext ? targetNextIndex : stepIndex

      const answersPayload = buildAnswersPayload(
        answers,
        currentStep.fields,
        opts?.fileNames
      )

      const patchRes = await axios.patch(`/api/client/wizard-applications/${app.id}`, {
        wizardStepId: currentStep.id,
        currentStepIndex: nextIndex,
        answers: answersPayload,
      })
      const savedApp = patchRes.data?.data?.application as AppDetail | undefined
      setFormDirty(false)
      setServerSyncVersion((v) => v + 1)
      if (savedApp) {
        appFingerprintRef.current = wizardApplicationDetailFingerprint(savedApp)
        appRef.current = savedApp
        setApp(savedApp)
      }

      if (opts?.submit) {
        const submitRes = await axios.post(
          `/api/client/wizard-applications/${app.id}/submit`,
          {
            wizardStepId: currentStep.id,
            answers: answersPayload,
          }
        )
        const submittedApp = submitRes.data?.data?.application as AppDetail | undefined
        if (submittedApp) {
          appFingerprintRef.current = wizardApplicationDetailFingerprint(submittedApp)
          appRef.current = submittedApp
          setApp(submittedApp)
        }
        toast({
          title: 'Application submitted',
          description: 'Status is now Pending. Our team will review it shortly.',
        })
        return
      }

      setSaveIndicator('saved')
      if (opts?.exit) {
        router.push('/client/applications')
        return
      }
      if (opts?.goNext) {
        setStepIndex(nextIndex)
      }
      if (!opts?.exit) {
        setTimeout(() => setSaveIndicator('idle'), 1500)
      }
    } catch (error: any) {
      setSaveIndicator('idle')
      toast({
        title: 'Save failed',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const lastFillableIndex = app ? lastClientFillableStepIndex(app.steps) : 0

  const stepNavItems = useMemo(
    () =>
      app?.steps.map((step) => ({
        id: step.id,
        formName: step.formName,
        paymentRequired: step.paymentRequired,
        adminUseOnly: step.adminUseOnly,
        filled: step.fields.some((f) => f.answer?.value || f.answer?.fileUrl),
      })) ?? [],
    [app?.steps]
  )

  const goToStep = (index: number) => {
    if (!app) return
    if (!canClientAccessStepIndex(app.steps, index)) {
      const block = firstBlockingApprovalStepBefore(app.steps, index)
      toast({
        title: 'Step locked',
        description:
          block !== null
            ? approvalAdvanceBlockedReason(app.steps[block])
            : 'Complete earlier steps first.',
        variant: 'destructive',
      })
      return
    }
    setStepIndex(index)
  }

  const continuePastAdminOnlyStep = () => {
    if (!app) return
    const next = nextClientFillableStepIndex(app.steps, stepIndex)
    if (next === null) {
      toast({
        title: 'No further steps',
        description:
          'Please wait for an administrator to complete this step, or go back to earlier steps.',
      })
      return
    }
    goToStep(next)
  }

  const areaLabel = app ? (app.areaOfInterest === 'CR' ? t('admin.wizards.areaOption.cr') : app.areaOfInterest === 'PR' ? t('admin.wizards.areaOption.pr') : getAreaLabel(app.areaOfInterest)) : ''

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title={app ? areaLabel || app.wizard.name : t('client.applications.pageTitle')}
      description={
        app
          ? `${app.applicationNumber} · ${areaLabel || app.areaOfInterest}`
          : t('client.applications.loading')
      }
      icon={<FileText className="h-5 w-5 text-emerald-600" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push('/client/applications')} className="cursor-pointer">
          {isRTL ? <ArrowRight className="h-4 w-4 ml-1.5" /> : <ArrowLeft className="h-4 w-4 mr-1.5" />}
          {t('admin.wizards.modal.back')}
        </Button>
      }
    >
      {authLoading || loading || !app ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={cn("flex flex-col xl:flex-row gap-5 items-start", isRTL ? "xl:flex-row-reverse" : "xl:flex-row")}>
            <div className="flex-1 min-w-0 w-full space-y-4">
              <div className={cn("flex flex-wrap items-center gap-2", isRTL ? "flex-row-reverse" : "flex-row")}>
                <StatusBadge status={app.status} />
                <span className="text-sm text-muted-foreground">
                  {t('client.fill.stepsFilled').replace('{completed}', String(app.progress.completedSteps)).replace('{total}', String(app.progress.totalSteps))}
                </span>
                {app.updatedAt && (
                  <span className={cn("text-sm text-muted-foreground", isRTL ? "mr-auto" : "ml-auto")}>
                    {t('client.fill.updated')} {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                  </span>
                )}
              </div>

              {applicationLocked && (
                <div
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm mb-4',
                    isRTL ? 'text-right' : 'text-left',
                    wizardStatusClasses(app.status)
                  )}
                >
                  <p className="font-medium">
                    {t('client.fill.status' as any) || (isRTL ? 'الحالة' : 'Status')}: {wizardStatusLabel(app.status)}
                  </p>
                  <p className="text-xs mt-0.5 opacity-90">
                    {isRTL
                      ? 'هذا الطلب لدى فريقنا. يتم تحديث الحالة وتفاصيل النموذج عندما يقوم الإدري بإجراء تغييرات.'
                      : 'This application is with our team. Status and form details update when admin makes changes.'}
                  </p>
                </div>
              )}

              {/* WhatsApp Status for Client */}
              {!applicationLocked && app.client?.phone && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">📱 Notification Status</p>
                  <WhatsAppStatus
                    status={whatsappStatus}
                    error={whatsappError}
                    recipient={app.client.phone}
                  />
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-4 items-start">
                <ApplicationStepsNav
                  steps={stepNavItems}
                  stepIndex={stepIndex}
                  onStepSelect={goToStep}
                  completedCount={app.progress.completedSteps}
                  isStepAccessible={(i) => canClientAccessStepIndex(app.steps, i)}
                  className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky pt-0"
                />

                <div className="flex-1 min-w-0 w-full">
              <Card className="shadow-md overflow-hidden">
                <h2 className={cn("text-lg font-semibold mb-3 px-6 pt-5", isRTL ? "text-right" : "text-left pt-0")}>{areaLabel || app.wizard.name}</h2>
                <CardContent className="pb-6">
                  {currentStep?.adminUseOnly ? (
                    <div className="flex flex-col items-center text-center py-10 px-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 border border-slate-200 mb-4">
                        <Lock className="h-6 w-6 text-slate-500" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Step {stepIndex + 1} of {app.steps.length} · Admin only
                      </p>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {currentStep.formName}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                        This step can only be completed by an administrator. Please continue with
                        the remaining available steps.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => goToStep(Math.max(0, stepIndex - 1))}
                          disabled={stepIndex <= 0}
                        >
                          <ArrowLeft className="h-4 w-4 mr-1.5" />
                          Back
                        </Button>
                        {nextClientFillableStepIndex(app.steps, stepIndex) !== null && (
                          <Button
                            type="button"
                            className="bg-emerald-700 hover:bg-emerald-800"
                            onClick={continuePastAdminOnlyStep}
                          >
                            Continue
                            <ArrowRight className="h-4 w-4 ml-1.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : currentStep ? (
                    <ApplicationStepForm
                      key={currentStep.id}
                      formName={currentStep.formName}
                      fields={currentStep.fields as StepField[]}
                      stepIndex={stepIndex}
                      totalSteps={app.steps.length}
                      paymentRequired={currentStep.paymentRequired}
                      approvalRequired={currentStep.approvalRequired}
                      approvalStatus={currentStep.approvalStatus ?? null}
                      rejectionNote={currentStep.rejectionNote}
                      isLastStep={stepIndex >= lastFillableIndex}
                      readOnly={isStepReadOnlyForClient(stepIndex)}
                      saving={saving}
                      saveIndicator={saveIndicator}
                      engaging
                      onBack={() => goToStep(Math.max(0, stepIndex - 1))}
                      onSave={(answers, opts) => saveStep(answers, opts)}
                      onSaveAndExit={(answers) => saveStep(answers)}
                      latestValuesRef={latestFormValuesRef}
                      onDirtyChange={setFormDirty}
                      serverSyncVersion={serverSyncVersion}
                      saveExitLabel="Save"
                      showSubmit={!applicationLocked}
                      allowStepAdvance={canClientAccessStepIndex(app.steps, stepIndex + 1)}
                      allowSubmit={findUnapprovedRequiredStepIndex(app.steps) === null}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No steps in this wizard.
                    </p>
                  )}
                </CardContent>
              </Card>
                </div>
              </div>
            </div>

            {app.adminNotes && (
              <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-20">
                <div className="relative mx-auto max-w-xs lg:max-w-none rotate-1 hover:rotate-0 transition-transform">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <Pin className="h-5 w-5 text-red-600 fill-red-500 drop-shadow" />
                  </div>
                  <div className="mt-2 rounded-sm bg-amber-100 border border-amber-200 shadow-[2px_4px_12px_rgba(0,0,0,0.12)] px-4 py-4 min-h-[140px]">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80 mb-2">
                      Note from admin
                    </p>
                    <p className="text-sm text-amber-950 whitespace-pre-wrap leading-relaxed">
                      {app.adminNotes}
                    </p>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </MobileLayout>
  )
}