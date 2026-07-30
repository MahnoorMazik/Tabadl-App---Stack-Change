'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ApplicationStepForm } from '@/components/client/ApplicationStepForm'
import { ApplicationStepsNav } from '@/components/wizards/ApplicationStepsNav'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Pin,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { cn } from '@/lib/utils'
import { wizardStatusClasses, wizardStatusLabel } from '@/lib/wizards/wizard-status'
import {
  AREA_OF_INTEREST_OPTIONS,
} from '@/components/admin/forms/types'
import {
  approvalAdvanceBlockedReason,
  canClientAccessStepIndex,
  findUnapprovedRequiredStepIndex,
  firstBlockingApprovalStepBefore,
  maxAccessibleStepIndex,
} from '@/lib/wizards/wizard-step-approval-rules'
import { wizardApplicationDetailFingerprint } from '@/lib/wizards/wizard-application-utils'

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
  steps: Array<{
    id: string
    index: number
    formName: string
    paymentRequired: boolean
    approvalRequired?: boolean
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
  return (
    AREA_OF_INTEREST_OPTIONS.find((o) => o.key === area)?.label ?? area
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('border hover:opacity-100', wizardStatusClasses(status))}>
      {status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
      {(status === 'APPROVED' || status === 'COMPLETED') && (
        <CheckCircle2 className="h-3 w-3 mr-1" />
      )}
      {status === 'REJECTED' && <AlertCircle className="h-3 w-3 mr-1" />}
      {(status === 'DRAFT' || status === 'HARD_COPY_REQUIRED') && (
        <FileText className="h-3 w-3 mr-1" />
      )}
      {wizardStatusLabel(status)}
    </Badge>
  )
}

export default function ClientApplicationFillPage() {
  const params = useParams()
  const id = String(params.id)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
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
  const [submitted, setSubmitted] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [serverSyncVersion, setServerSyncVersion] = useState(0)
  const latestFormValuesRef = useRef<Record<string, string>>({})
  const appFingerprintRef = useRef<string | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await axios.get(`/api/client/wizard-applications/${id}`)
        const detail = res.data?.data?.application as AppDetail
        const fingerprint = wizardApplicationDetailFingerprint(detail)

        if (silent && fingerprint === appFingerprintRef.current) return

        appFingerprintRef.current = fingerprint
        setApp(detail)
        if (!silent) {
          const maxIdx = Math.max(0, detail.steps.length - 1)
          const allowedMax = maxAccessibleStepIndex(detail.steps)
          setStepIndex(
            Math.min(detail.currentStepIndex ?? 0, maxIdx, allowedMax)
          )
        }
        setSubmitted(detail.status !== 'DRAFT')
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
    if (authLoading || !user) return
    // Background refresh only after submit — not while client is filling the form.
    if (!submitted) return
    const timer = setInterval(() => {
      if (formDirty || saving) return
      void load(true)
    }, 60000)
    return () => clearInterval(timer)
  }, [authLoading, user, load, submitted, formDirty, saving])

  const currentStep = app?.steps[stepIndex]

  const stepHasSavedAnswers = (step: AppDetail['steps'][number]) =>
    step.fields.some((f) => f.answer?.value || f.answer?.fileUrl)

  const isStepLockedForClient = (step: AppDetail['steps'][number]) => {
    if (!step.approvalRequired) return false
    if (!stepHasSavedAnswers(step)) return false
    return step.approvalStatus === 'PENDING' || step.approvalStatus === 'APPROVED'
  }

  const buildAnswersPayload = (
    answers: Record<string, string>,
    fields: AppDetail['steps'][number]['fields']
  ) =>
    fields.map((field) => {
      const raw =
        answers[field.fieldId] ??
        field.answer?.value ??
        field.answer?.fileUrl ??
        ''
      const trimmed = String(raw).trim()
      return {
        fieldId: field.fieldId,
        value: trimmed || null,
      }
    })

  const saveStep = async (
    answers: Record<string, string>,
    opts?: { goNext?: boolean; submit?: boolean; exit?: boolean }
  ) => {
    if (!app || !currentStep) return

    if (opts?.submit && findUnapprovedRequiredStepIndex(app.steps) !== null) {
      toast({
        title: 'Approval required',
        description: 'All admin approval steps must be approved before submitting.',
        variant: 'destructive',
      })
      return
    }

    if (opts?.goNext && !canClientAccessStepIndex(app.steps, stepIndex + 1)) {
      const block = firstBlockingApprovalStepBefore(app.steps, stepIndex + 1)
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
      const nextIndex = opts?.goNext
        ? Math.min(stepIndex + 1, app.steps.length - 1)
        : stepIndex

      const answersPayload = buildAnswersPayload(answers, currentStep.fields)

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
          setApp(submittedApp)
        }
        setSubmitted(true)
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

  const stepNavItems = useMemo(
    () =>
      app?.steps.map((step) => ({
        id: step.id,
        formName: step.formName,
        paymentRequired: step.paymentRequired,
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

  const areaLabel = app ? getAreaLabel(app.areaOfInterest) : ''

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title={app ? areaLabel || app.wizard.name : 'Application'}
      description={app ? `${app.applicationNumber} · ${areaLabel || app.areaOfInterest}` : 'Loading…'}
      icon={<FileText className="h-5 w-5 text-emerald-600" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push('/client/applications')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
      }
    >
      {authLoading || loading || !app ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-5 items-start">
            <div className="flex-1 min-w-0 w-full space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={app.status} />
                {/* <Badge variant="secondary" className="bg-violet-100 text-violet-800 border border-violet-200">
                  {areaLabel}
                </Badge> */}
                <span className="text-sm text-muted-foreground">
                  {app.progress.completedSteps}/{app.progress.totalSteps} steps filled
                </span>
                {app.updatedAt && (
                  <span className="text-sm text-muted-foreground ml-auto">
                    Updated {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                  </span>
                )}
              </div>

              {submitted && (
                <div
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm',
                    wizardStatusClasses(app.status)
                  )}
                >
                  <p className="font-medium">Status: {wizardStatusLabel(app.status)}</p>
                  <p className="text-xs mt-0.5 opacity-90">
                    This application is with our team. Status and form details update when admin
                    makes changes.
                  </p>
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-4 items-start">
                <ApplicationStepsNav
                  steps={stepNavItems}
                  stepIndex={stepIndex}
                  onStepSelect={goToStep}
                  completedCount={app.progress.completedSteps}
                  isStepAccessible={(i) => canClientAccessStepIndex(app.steps, i)}
                  areaLabel={areaLabel}
                  className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky pt-0"
                />

                <div className="flex-1 min-w-0 w-full">
              <Card className="shadow-md overflow-hidden">
                <h2 className="text-lg font-semibold mb-3 px-6">{areaLabel}</h2>
                <CardContent className="pb-6">
                  {currentStep ? (
                    <ApplicationStepForm
                      key={currentStep.id}
                      formName={currentStep.formName}
                      fields={currentStep.fields}
                      stepIndex={stepIndex}
                      totalSteps={app.steps.length}
                      paymentRequired={currentStep.paymentRequired}
                      approvalRequired={currentStep.approvalRequired}
                      approvalStatus={currentStep.approvalStatus ?? null}
                      rejectionNote={currentStep.rejectionNote}
                      isLastStep={stepIndex >= app.steps.length - 1}
                      readOnly={submitted || isStepLockedForClient(currentStep)}
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
                      showSubmit={!submitted}
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

            {/* Sticky note — admin updates */}
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
