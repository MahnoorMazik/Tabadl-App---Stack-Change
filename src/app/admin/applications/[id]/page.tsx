'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { format } from 'date-fns'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApplicationStepForm } from '@/components/client/ApplicationStepForm'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  FileText,
  Loader2,
  Save,
  Pin,
  Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  wizardStatusSelectTriggerClasses,
} from '@/lib/wizards/wizard-status'
import { ApplicationStepsNav } from '@/components/wizards/ApplicationStepsNav'

type AppDetail = {
  id: string
  applicationNumber: string
  status: string
  areaOfInterest: string
  currentStepIndex: number
  submittedAt: string | null
  updatedAt: string
  adminNotes?: string | null
  client: { id: string; name: string; email: string; phone?: string | null }
  wizard: { id: string; name: string }
  steps: Array<{
    id: string
    index: number
    formName: string
    formTemplateId?: string
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

type FormOption = {
  id: string
  name: string
  areaOfInterest?: string | null
  fieldCount?: number
}

export default function AdminApplicationDetailPage() {
  const params = useParams()
  const id = String(params.id)
  const router = useRouter()
  const { toast } = useToast()
  const [app, setApp] = useState<AppDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [statusSaving, setStatusSaving] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [forms, setForms] = useState<FormOption[]>([])
  const [addFormId, setAddFormId] = useState<string>('')
  const [addPayment, setAddPayment] = useState(false)
  const [addingStep, setAddingStep] = useState(false)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [serverSyncVersion, setServerSyncVersion] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/admin/wizard-applications/${id}`)
      const detail = res.data?.data?.application as AppDetail
      setApp(detail)
      setAdminNotes(detail.adminNotes ?? '')
      setStepIndex(Math.min(detail.currentStepIndex ?? 0, Math.max(0, detail.steps.length - 1)))
    } catch {
      toast({ title: 'Application not found', variant: 'destructive' })
      router.replace('/admin/applications')
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await axios.get('/api/admin/form-templates')
        const list = res.data?.data?.templates ?? res.data?.templates ?? []
        if (!cancelled) {
          setForms(
            list.map((t: any) => ({
              id: t.id,
              name: t.name,
              areaOfInterest: t.areaOfInterest,
              fieldCount: t.fieldCount,
            }))
          )
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const currentStep = app?.steps[stepIndex]

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

  const saveAnswers = async (
    answers: Record<string, string>,
    opts?: { goNext?: boolean }
  ) => {
    if (!app || !currentStep) return
    setSaving(true)
    setSaveIndicator('saving')
    try {
      const nextIndex = opts?.goNext
        ? Math.min(stepIndex + 1, app.steps.length - 1)
        : stepIndex

      const res = await axios.patch(`/api/admin/wizard-applications/${app.id}`, {
        wizardStepId: currentStep.id,
        currentStepIndex: nextIndex,
        answers: buildAnswersPayload(answers, currentStep.fields),
      })
      const savedApp = res.data?.data?.application as AppDetail | undefined
      setFormDirty(false)
      setServerSyncVersion((v) => v + 1)
      if (savedApp) {
        setApp(savedApp)
        if (opts?.goNext) {
          setStepIndex(nextIndex)
        }
      }
      setSaveIndicator('saved')
      toast({ title: 'Answers saved' })
      setTimeout(() => setSaveIndicator('idle'), 1500)
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

  const updateStatus = async (status: string) => {
    if (!app) return
    setStatusSaving(true)
    try {
      await axios.patch(`/api/admin/wizard-applications/${app.id}`, { status })
      toast({ title: 'Status updated — client will see this' })
      await load()
    } catch (error: any) {
      toast({
        title: 'Status update failed',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setStatusSaving(false)
    }
  }

  const saveAdminNotes = async () => {
    if (!app) return
    setNotesSaving(true)
    try {
      await axios.patch(`/api/admin/wizard-applications/${app.id}`, {
        adminNotes: adminNotes.trim() || null,
      })
      toast({ title: 'Note saved — visible to client' })
      await load()
    } catch (error: any) {
      toast({
        title: 'Could not save note',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setNotesSaving(false)
    }
  }

  const addNextStep = async () => {
    if (!app || !addFormId) {
      toast({ title: 'Select a form', variant: 'destructive' })
      return
    }
    setAddingStep(true)
    try {
      const res = await axios.post(`/api/admin/wizard-applications/${app.id}/steps`, {
        formTemplateId: addFormId,
        paymentRequired: addPayment,
      })
      const detail = res.data?.data?.application as AppDetail
      setApp(detail)
      setAddFormId('')
      setAddPayment(false)
      setStepIndex(Math.max(0, detail.steps.length - 1))
      toast({ title: 'Next step added' })
    } catch (error: any) {
      toast({
        title: 'Could not add step',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setAddingStep(false)
    }
  }

  const approveStep = async () => {
    if (!app || !currentStep) return
    setReviewSaving(true)
    try {
      const res = await axios.patch(`/api/admin/wizard-applications/${app.id}`, {
        stepApproval: { wizardStepId: currentStep.id, status: 'APPROVED' },
      })
      setApp(res.data?.data?.application as AppDetail)
      setServerSyncVersion((v) => v + 1)
      setFormDirty(false)
      toast({
        title: 'Step approved',
        description: 'The client cannot change approved answers on this step.',
      })
    } catch (error: any) {
      toast({
        title: 'Could not approve step',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setReviewSaving(false)
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

  if (loading) {
    return (
      <AdminPageTemplate
        title="Application"
        description="Loading…"
        icon={<FileText className="h-5 w-5" />}
        showConstruction={false}
        requiredPermission="applications.view"
        fullWidth
      >
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminPageTemplate>
    )
  }

  if (!app) return null

  const existingTemplateIds = new Set(
    app.steps.map((s) => s.formTemplateId).filter(Boolean) as string[]
  )
  const availableForms = forms.filter((f) => !existingTemplateIds.has(f.id))

  const currentStepHasSaved =
    currentStep?.fields.some((f) => f.answer?.value || f.answer?.fileUrl) ?? false
  const showStepReviewActions =
    Boolean(currentStep?.approvalRequired) &&
    currentStepHasSaved &&
    currentStep?.approvalStatus === 'PENDING'

  return (
    <AdminPageTemplate
      title={app.wizard.name}
      description={`${app.applicationNumber} · ${app.client.name}`}
      icon={<FileText className="h-5 w-5" />}
      showConstruction={false}
      requiredPermission="applications.view"
      fullWidth
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/applications')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to list
        </Button>
      }
    >
      <div className="flex flex-col xl:flex-row gap-5 items-start max-w-7xl">
        <div className="flex-1 min-w-0 space-y-4 w-full">
          {/* Overview */}
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Overview
                  </p>
                  <p className="text-sm font-semibold mt-0.5">{app.wizard.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={app.status}
                    onValueChange={updateStatus}
                    disabled={statusSaving}
                  >
                    <SelectTrigger
                      className={cn(
                        'w-[200px] h-9 border font-medium',
                        wizardStatusSelectTriggerClasses(app.status)
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">In progress (client)</SelectItem>
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

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-900">
                  <span className="text-indigo-500 font-medium">Client</span>
                  {app.client.name}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                  <span className="text-slate-400 font-medium">Email</span>
                  {app.client.email}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-900">
                  <span className="text-violet-500 font-medium">AOI</span>
                  {app.areaOfInterest}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs text-teal-900">
                  <span className="text-teal-600 font-medium">Progress</span>
                  {app.progress.completedSteps}/{app.progress.totalSteps} filled
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-mono text-slate-600">
                  {app.applicationNumber}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 ml-auto">
                  <span className="text-slate-400 font-medium">Updated</span>
                  {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <ApplicationStepsNav
              steps={stepNavItems}
              stepIndex={stepIndex}
              onStepSelect={setStepIndex}
              completedCount={app.progress.completedSteps}
              className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-20"
            />

            <div className="flex-1 min-w-0 w-full space-y-4">
              <Card>
            <CardContent className="pt-5">
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
                  saving={saving}
                  saveIndicator={saveIndicator}
                  engaging
                  saveExitLabel="Save"
                  onDirtyChange={setFormDirty}
                  serverSyncVersion={serverSyncVersion}
                  headerActions={
                    <>
                      {currentStep.approvalStatus === 'APPROVED' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Approved
                        </Badge>
                      )}
                      {currentStep.approvalStatus === 'REJECTED' && (
                        <Badge variant="destructive" className="text-[10px]">
                          Rejected
                        </Badge>
                      )}
                      {showStepReviewActions && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800"
                          disabled={reviewSaving || saving}
                          onClick={() => void approveStep()}
                        >
                          {reviewSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                      )}
                    </>
                  }
                  onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
                  onSave={async (answers, opts) => {
                    await saveAnswers(answers, { goNext: opts?.goNext })
                  }}
                  onSaveAndExit={async (answers) => {
                    await saveAnswers(answers)
                  }}
                  showSubmit={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No steps.</p>
              )}
            </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Sticky note panel — right */}
        <aside className="w-full xl:w-72 shrink-0 xl:sticky xl:top-20">
          <div className="relative rotate-1 hover:rotate-0 transition-transform">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
              <Pin className="h-5 w-5 text-red-600 fill-red-500 drop-shadow" />
            </div>
            <div className="mt-2 rounded-sm bg-amber-100 border border-amber-200 shadow-[2px_6px_16px_rgba(0,0,0,0.12)] px-4 py-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">
                Sticky note for client
              </p>
              <Textarea
                rows={6}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Write an update the client will see…"
                className="bg-amber-50/80 border-amber-300/60 text-amber-950 placeholder:text-amber-800/40 resize-none focus-visible:ring-amber-400"
              />
              <Button
                size="sm"
                className="w-full bg-amber-700 hover:bg-amber-800 text-white"
                onClick={saveAdminNotes}
                disabled={notesSaving}
              >
                {notesSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Pin note
              </Button>
              <p className="text-[10px] text-amber-800/70 leading-snug">
                Client sees this on Applied applications and inside the form.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AdminPageTemplate>
  )
}
