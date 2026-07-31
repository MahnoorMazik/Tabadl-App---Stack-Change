'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { differenceInYears, format, isValid, parseISO } from 'date-fns'
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
  User,
  Calendar,
  Phone,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  wizardStatusSelectTriggerClasses,
} from '@/lib/wizards/wizard-status'
import { ApplicationStepsNav } from '@/components/wizards/ApplicationStepsNav'
import { areaOfInterestDisplayLabel } from '@/components/admin/forms/types'
import { any } from 'zod'

type AppDetail = {
  id: string
  applicationNumber: string
  status: string
  areaOfInterest: string
  currentStepIndex: number
  submittedAt: string | null
  updatedAt: string
  adminNotes?: string | null
  client: {
    id: string
    name: string
    email: string
    phone?: string | null
    clientNumber?: string | null
  }
  wizard: { id: string; name: string }
  steps: Array<{
    id: string
    index: number
    formName: string
    formTemplateId?: string
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
  }>  | any
  progress: { totalSteps: number; completedSteps: number }
}

type FormOption = {
  id: string
  name: string
  areaOfInterest?: string | null
  fieldCount?: number
}

function findAnswerByLabels(
  steps: AppDetail['steps'],
  labels: string[]
): string | null {
  const normalized = labels.map((l) => l.toLowerCase())
  for (const step of steps) {
    for (const field of step.fields) {
      const label = field.label.toLowerCase()
      if (normalized.some((n) => label.includes(n))) {
        const value = field.answer?.value?.trim()
        if (value) return value
      }
    }
  }
  return null
}

function parseBirthDate(value: string | null): Date | null {
  if (!value) return null
  const iso = parseISO(value)
  if (isValid(iso)) return iso
  const fallback = new Date(value)
  return isValid(fallback) ? fallback : null
}

function formatAge(dob: Date | null): string | null {
  if (!dob) return null
  const years = differenceInYears(new Date(), dob)
  if (years < 0 || years > 150) return null
  return `${years} year${years === 1 ? '' : 's'}`
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
      ; (async () => {
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
        adminUseOnly: step.adminUseOnly,
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

  const gender = findAnswerByLabels(app.steps, ['gender', 'sex'])
  const dobRaw = findAnswerByLabels(app.steps, [
    'date of birth',
    'dob',
    'birth date',
    'birthdate',
  ])
  const dob = parseBirthDate(dobRaw)
  const age = formatAge(dob)
  const clientNumber = app.client.clientNumber || app.applicationNumber
  const primaryId =
    findAnswerByLabels(app.steps, [
      'primary id',
      'national id',
      'iqama',
      'passport',
      'id number',
    ]) || app.client.clientNumber || '—'
  const phone =
    app.client.phone ||
    findAnswerByLabels(app.steps, ['phone', 'mobile', 'whatsapp']) ||
    null

  const areaLabel = areaOfInterestDisplayLabel(app.areaOfInterest)

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
          <Card className="border-border/80 shadow-sm py-0">
            <CardContent className="py-5 px-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    Overview
                  </h2>
                  <div className='flex items-center gap-3'>
                    {/* <p className="text-base font-semibold mt-0.5 text-gray-500">
                      {app.wizard.name}
                    </p> */}
                    <p className="inline-flex items-center gap-1.5">
                      <span className="text-gray-500 text-sm">Updated on: </span>
                      <span className="text-gray-600 font-medium text-sm">
                        {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Select
                    value={app.status}
                    onValueChange={updateStatus}
                    disabled={statusSaving}
                  >
                    <SelectTrigger
                      className={cn(
                        'w-full sm:w-[180px] h-9 shadow-xs transition-[color,box-shadow] outline-none',
                        'focus:ring-0 focus:ring-offset-0',
                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
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
                  {/* <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                    <span className="text-slate-400 font-medium">Updated</span>
                    {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                  </span> */}
                </div>
              </div>

              {/* <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-900">
                  <span className="text-indigo-500 font-medium">Client</span>
                  {app.client.name}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                  <span className="text-slate-400 font-medium">Email</span>
                  {app.client.email}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-900">
                  <span className="text-violet-500 font-medium">AOI</span>
                  {app.areaOfInterest} · {areaOfInterestDisplayLabel(app.areaOfInterest)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900">
                  <span className="text-emerald-600 font-medium">Progress</span>
                  {app.progress.completedSteps}/{app.progress.totalSteps} filled
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-mono text-slate-600">
                  {app.applicationNumber}
                </span>
              </div> */}

              {/* Client profile strip — same layout as reference, theme + app fields */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className='text-gray-500 text-sm'>
                    Client:
                  </span>
                  <span className="text-gray-600 font-medium text-sm">
                    {app.client.name}
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span className='text-gray-500 text-sm'>
                    Email:
                  </span>
                  <span className="text-gray-600 font-medium text-sm">
                    {app.client.email}
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span className='text-gray-500 text-sm'>
                    AOI:
                  </span>
                  <span className="text-gray-600 font-medium text-sm">{app.areaOfInterest} · {areaOfInterestDisplayLabel(app.areaOfInterest)}</span>
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span className='text-gray-500 text-sm'>
                    Progress:
                  </span>
                  <span className="text-gray-600 font-medium text-sm">{app.progress.completedSteps}/{app.progress.totalSteps} filled</span>
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span className='text-gray-500 text-sm'>
                    App No:
                  </span>
                  <span className="text-gray-600 font-medium text-sm">{app.applicationNumber}</span>
                </span>

                {/* {phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <span>
                      Phone: <span className="text-foreground">{phone}</span>
                    </span>
                  </span>
                )} */}

                {/* <span>
                  Primary ID: <span className="text-foreground">{primaryId}</span>
                </span> */}
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
              <Card className="pt-0 pb-0 shadow-md overflow-hidden">
                <h2 className="text-lg font-semibold mb-3 px-6 pt-5">{areaLabel}</h2>
            <CardContent className="pt-0 pb-5">
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
                      {currentStep.adminUseOnly && (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          Admin only
                        </Badge>
                      )}
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
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-800/80">
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
                className="w-full bg-amber-700 hover:bg-amber-800 text-white cursor-pointer"
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
              <p className="text-xs text-amber-800/70 leading-snug">
                Client sees this on Applied applications and inside the form.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AdminPageTemplate>
  )
}
