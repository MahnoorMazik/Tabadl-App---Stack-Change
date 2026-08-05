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
import { buildWizardAnswersPayload } from '@/lib/wizards/wizard-file-utils'
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
  Mail,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  wizardStatusSelectTriggerClasses,
} from '@/lib/wizards/wizard-status'
import { ApplicationStepsNav } from '@/components/wizards/ApplicationStepsNav'
import { areaOfInterestDisplayLabel } from '@/components/admin/forms/types'
import { useLocale } from '@/contexts/LocaleContext'
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
  }>
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
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'
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
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/admin/wizard-applications/${id}`)
      const detail = res.data?.data?.application as AppDetail
      setApp(detail)
      setAdminNotes(detail.adminNotes ?? '')
      setStepIndex(Math.min(detail.currentStepIndex ?? 0, Math.max(0, detail.steps.length - 1)))
      setEmailStatus(null)
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
    fields: AppDetail['steps'][number]['fields'],
    fileNames?: Record<string, string>
  ) => buildWizardAnswersPayload(answers, fields, fileNames)

  const saveAnswers = async (
    answers: Record<string, string>,
    opts?: { goNext?: boolean; fileNames?: Record<string, string> }
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
        answers: buildAnswersPayload(answers, currentStep.fields, opts?.fileNames),
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
    
    if (status === app.status) {
      toast({
        title: 'No change',
        description: 'Application already has this status',
        variant: 'default',
      })
      return
    }

    setStatusSaving(true)
    setEmailStatus(null)
    
    try {
      const response = await axios.patch(
        `/api/admin/wizard-applications/${app.id}/status`,
        { 
          status,
          adminNotes: adminNotes.trim() || undefined,
          sendEmail: true,
        }
      )
      
      const data = response.data.data
      
      if (data.emailSent) {
        setEmailStatus({
          sent: true,
          message: `✅ Email notification sent to ${app.client.email}`,
        })
      } else {
        setEmailStatus({
          sent: false,
          message: `⚠️ Status updated but email failed to send. Error: ${data.emailError || 'Unknown error'}`,
        })
      }
      
      toast({ 
        title: `✅ Status updated to ${status}`,
        description: data.emailSent 
          ? `Email notification sent to ${app.client.email}` 
          : '⚠️ Status updated but email failed to send',
        variant: data.emailSent ? 'default' : 'destructive',
        duration: 5000,
      })
      
      await load()
      
    } catch (error: any) {
      setEmailStatus({
        sent: false,
        message: `❌ Status update failed: ${error.response?.data?.error?.message || error.message}`,
      })
      toast({
        title: '❌ Status update failed',
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
          {isRTL ? <ArrowRight className="h-4 w-4 ml-1.5" /> : <ArrowLeft className="h-4 w-4 mr-1.5" />}
          {t('client.applications.backToList')}
        </Button>
      }
    >
      <div className={cn("flex flex-col xl:flex-row gap-5 items-start max-w-7xl", isRTL ? "xl:flex-row-reverse" : "xl:flex-row")} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex-1 min-w-0 space-y-4 w-full">
          <Card className="border-border/80 shadow-sm py-0">
            <CardContent className="py-5 px-5 space-y-4">
              <div className={cn("flex flex-wrap items-start justify-between gap-3", isRTL ? "flex-row-reverse" : "flex-row")}>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <h2 className="text-lg font-semibold">
                    {isRTL ? 'نظرة عامة' : 'Overview'}
                  </h2>
                  <div className={cn("flex items-center gap-3", isRTL ? "flex-row-reverse" : "flex-row")}>
                    {/* <p className="text-base font-semibold mt-0.5 text-gray-500">
                      {app.wizard.name}
                    </p> */}
                    <p className="inline-flex items-center gap-1.5">
                      <span className="text-gray-500 text-sm">{isRTL ? 'آخر تحديث: ' : 'Updated on: '}</span>
                      <span className="text-gray-600 font-medium text-sm">
                        {format(new Date(app.updatedAt), 'dd MMM yyyy HH:mm')}
                      </span>
                    </p>
                  </div>
                </div>
                <div className={cn("flex flex-col gap-2", isRTL ? "items-start" : "items-end")}>
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
                    <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                      <SelectItem value="DRAFT">{t('admin.applications.status.inProgress')}</SelectItem>
                      <SelectItem value="PENDING">{t('admin.applications.status.pending')}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{t('admin.applications.status.underReview')}</SelectItem>
                      <SelectItem value="HARD_COPY_REQUIRED">{t('admin.applications.status.hardCopyRequired')}</SelectItem>
                      <SelectItem value="APPROVED">{t('admin.applications.status.approved')}</SelectItem>
                      <SelectItem value="REJECTED">{t('admin.applications.status.rejected')}</SelectItem>
                      <SelectItem value="COMPLETED">{t('admin.applications.status.completed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {emailStatus && (
                    <div className={cn(
                      'text-xs flex items-center gap-1.5 px-2 py-1 rounded-md',
                      emailStatus.sent 
                        ? 'text-green-700 bg-green-50 border border-green-200' 
                        : 'text-red-700 bg-red-50 border border-red-200'
                    )}>
                      {emailStatus.sent ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      <span className="truncate max-w-[200px]">{emailStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>

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
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
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
            <div className="mt-2 rounded-sm bg-amber-100 border border-amber-200 shadow-[2px_6px_16px_rgba(0,0,0,0.12)] px-4 py-4 space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
              <p className={cn("text-sm font-semibold uppercase tracking-wide text-amber-800/80", isRTL ? "text-right" : "text-left")}>
                {isRTL ? 'ملاحظة لاصقة للعميل' : 'Sticky note for client'}
              </p>
              <Textarea
                rows={6}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={isRTL ? 'اكتب تحديثًا سيراه العميل...' : 'Write an update the client will see…'}
                className={cn("bg-amber-50/80 border-amber-300/60 text-amber-950 placeholder:text-amber-800/40 resize-none focus-visible:ring-amber-400", isRTL ? "text-right" : "text-left")}
              />
              <Button
                size="sm"
                className="w-full bg-amber-700 hover:bg-amber-800 text-white cursor-pointer"
                onClick={saveAdminNotes}
                disabled={notesSaving}
              >
                {notesSaving ? (
                  <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                ) : (
                  <Save className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                )}
                {isRTL ? 'تثبيت الملاحظة' : 'Pin note'}
              </Button>
              <p className={cn("text-xs text-amber-800/70 leading-snug", isRTL ? "text-right" : "text-left")}>
                {isRTL ? 'يرى العميل هذا في الطلبات المقدمة وداخل النموذج.' : 'Client sees this on Applied applications and inside the form.'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AdminPageTemplate>
  )
}