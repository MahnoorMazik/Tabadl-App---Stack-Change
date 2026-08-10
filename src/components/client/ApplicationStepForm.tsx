'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileInput } from '@/components/ui/file-input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ArrowRight, Check, Save, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import axios from 'axios'
import { WizardFilePreview } from '@/components/wizards/WizardFilePreview'
import { FieldHelpTooltip } from '@/components/forms/FieldHelpTooltip'
import { isWizardFileUrl } from '@/lib/wizards/wizard-file-utils'
import { useLocale } from '@/contexts/LocaleContext'
import { getLocalizedText } from '@/lib/multilingual-text'

export interface StepField {
  id?: string
  required?: boolean
  fieldId: string
  label: string
  type: string
  isRequired?: boolean
  options?: string[] | null
  helpText?: string | null
  placeholder?: string | null
  answer?: { value: string | null; fileUrl: string | null }
}

export interface ApplicationStepFormProps {
  formName: string
  fields: StepField[]
  stepId?: string
  stepNumber?: number
  isAdminActingOnBehalf?: boolean
  onSaveExit?: (answers: Record<string, string>) => void | Promise<void>
  stepIndex: number
  totalSteps: number
  paymentRequired?: boolean
  approvalRequired?: boolean
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  rejectionNote?: string | null
  isLastStep?: boolean
  readOnly?: boolean
  saving?: boolean
  saveIndicator?: 'idle' | 'saving' | 'saved'
  onBack?: () => void
  onSave?: (
    answers: Record<string, string>,
    opts?: { goNext?: boolean; submit?: boolean; fileNames?: Record<string, string> }
  ) => void | Promise<void>
  onSaveAndExit?: (
    answers: Record<string, string>,
    opts?: { fileNames?: Record<string, string> }
  ) => void | Promise<void>
  /** Label for secondary save button (default: Save & exit) */
  saveExitLabel?: string
  showSubmit?: boolean
  /** Stronger visual treatment for the form canvas */
  engaging?: boolean
  /** When false, Save & continue / submit advance is blocked (e.g. pending approval). */
  allowStepAdvance?: boolean
  allowSubmit?: boolean
  /** Extra controls in the step header (e.g. admin approve/reject) */
  headerActions?: React.ReactNode
  /** Optional ref kept in sync with the latest field values (for save/submit). */
  latestValuesRef?: React.MutableRefObject<Record<string, string>>
  /** Fired when the user edits fields (true) or values sync from server (false). */
  onDirtyChange?: (dirty: boolean) => void
  /** Increment after a successful save to force syncing saved answers from server. */
  serverSyncVersion?: number
  /** Wizard application id — required for FILE field uploads. */
  applicationId?: string
  /** Upload API prefix, e.g. /api/client/wizard-applications or /api/admin/wizard-applications */
  fileUploadBasePath?: string
}

export function ApplicationStepForm({
  formName,
  fields,
  stepIndex,
  totalSteps,
  paymentRequired,
  approvalRequired,
  approvalStatus,
  rejectionNote,
  isLastStep,
  readOnly = false,
  saving = false,
  saveIndicator = 'idle',
  onBack,
  onSave,
  onSaveAndExit,
  saveExitLabel = 'Save as Draft',
  showSubmit = true,
  engaging = false,
  headerActions,
  allowStepAdvance = true,
  allowSubmit = true,
  latestValuesRef,
  onDirtyChange,
  serverSyncVersion = 0,
  applicationId,
  fileUploadBasePath,
}: ApplicationStepFormProps) {
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'
  const localizedFormName = getLocalizedText(formName, locale)
  const [values, setValues] = useState<Record<string, string>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const valuesRef = useRef<Record<string, string>>({})
  const fileNamesRef = useRef<Record<string, string>>({})
  const fieldsRef = useRef(fields)
  fieldsRef.current = fields
  const isDirtyRef = useRef(false)
  const lastServerSyncVersionRef = useRef(serverSyncVersion)

  /** Only re-sync from server when step or saved answers change — not on every parent re-render. */
  const fieldsSyncKey = useMemo(
    () =>
      `${stepIndex}|${fields
        .map(
          (f) =>
            `${f.fieldId}:${f.answer?.value ?? ''}:${f.answer?.fileUrl ?? ''}:${f.isRequired ? 1 : 0}`
        )
        .join(';')}`,
    [stepIndex, fields]
  )

  const lastSyncedKeyRef = useRef<string | null>(null)

  const syncValues = (next: Record<string, string>, fromServer = false) => {
    valuesRef.current = next
    if (latestValuesRef) latestValuesRef.current = next
    setValues(next)
    if (fromServer) {
      isDirtyRef.current = false
      onDirtyChange?.(false)
    }
  }

  const stepFromSyncKey = (key: string) => key.split('|', 1)[0]

  useEffect(() => {
    const forced = serverSyncVersion !== lastServerSyncVersionRef.current
    if (forced) lastServerSyncVersionRef.current = serverSyncVersion

    if (!forced && lastSyncedKeyRef.current === fieldsSyncKey) return

    const prevKey = lastSyncedKeyRef.current
    if (
      !forced &&
      isDirtyRef.current &&
      prevKey !== null &&
      stepFromSyncKey(prevKey) === stepFromSyncKey(fieldsSyncKey)
    ) {
      lastSyncedKeyRef.current = fieldsSyncKey
      return
    }

    lastSyncedKeyRef.current = fieldsSyncKey

    const initial: Record<string, string> = {}
    const initialNames: Record<string, string> = {}
    for (const field of fieldsRef.current) {
      if (field.type === 'FILE') {
        const url = field.answer?.fileUrl ?? ''
        const name =
          field.answer?.value && !isWizardFileUrl(field.answer.value)
            ? field.answer.value
            : ''
        initial[field.fieldId] = url || field.answer?.value || ''
        if (name) initialNames[field.fieldId] = name
      } else {
        initial[field.fieldId] = field.answer?.value ?? field.answer?.fileUrl ?? ''
      }
    }
    syncValues(initial, true)
    fileNamesRef.current = initialNames
    setFileNames(initialNames)
    setErrors({})
  }, [fieldsSyncKey, serverSyncVersion])

  const setValue = (fieldId: string, value: string) => {
    const next = { ...valuesRef.current, [fieldId]: value }
    valuesRef.current = next
    if (latestValuesRef) latestValuesRef.current = next
    setValues(next)
    if (!isDirtyRef.current) {
      isDirtyRef.current = true
      onDirtyChange?.(true)
    }
    setErrors((prev) => {
      if (!prev[fieldId]) return prev
      const nextErrors = { ...prev }
      delete nextErrors[fieldId]
      return nextErrors
    })
  }

  const setFileName = (fieldId: string, name: string) => {
    const next = { ...fileNamesRef.current, [fieldId]: name }
    fileNamesRef.current = next
    setFileNames(next)
  }

  const getCurrentValues = () => ({ ...valuesRef.current })
  const getCurrentFileNames = () => ({ ...fileNamesRef.current })

  const validate = (currentValues: Record<string, string>) => {
    const nextErrors: Record<string, string> = {}
    for (const field of fields) {
      if (field.type === 'INSTRUCTION') continue
      const raw = String(currentValues[field.fieldId] ?? '').trim()
      const hasFile =
        field.type === 'FILE' &&
        (isWizardFileUrl(raw) || Boolean(field.answer?.fileUrl))
      if (field.isRequired && !raw && !hasFile) {
        nextErrors[field.fieldId] = 'Required'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleFileUpload = async (fieldId: string, file: File | undefined) => {
    if (!file) return
    if (!applicationId || !fileUploadBasePath) {
      setErrors((prev) => ({
        ...prev,
        [fieldId]: 'File upload is not available for this form.',
      }))
      return
    }

    setUploadingFieldId(fieldId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post(
        `${fileUploadBasePath}/${applicationId}/files`,
        formData
      )
      const url = res.data?.data?.fileUrl
      const originalName = res.data?.data?.originalName || file.name
      if (!url) throw new Error('File URL missing')
      setValue(fieldId, url)
      setFileName(fieldId, originalName)
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'File upload failed'
      setErrors((prev) => ({ ...prev, [fieldId]: message }))
    } finally {
      setUploadingFieldId(null)
    }
  }

  const handleRemoveFile = (fieldId: string) => {
    setValue(fieldId, '')
    setFileName(fieldId, '')
  }

  const handleContinue = async () => {
    const curr = getCurrentValues()
    if (!validate(curr)) return
    const fileNamesMap = getCurrentFileNames()

    if (isLastStep && showSubmit) {
      if (onSave) {
        await onSave(curr, { submit: true, fileNames: fileNamesMap })
      }
      return
    }

    if (onSave) {
      await onSave(curr, { goNext: true, fileNames: fileNamesMap })
    }
  }

  const handleSaveExit = async () => {
    const curr = getCurrentValues()
    const fileNamesMap = getCurrentFileNames()
    if (onSaveAndExit) {
      await onSaveAndExit(curr, { fileNames: fileNamesMap })
    } else if (onSave) {
      await onSave(curr, { fileNames: fileNamesMap })
    }
  }

  const progressPct = totalSteps > 0 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
    <Card className={cn('overflow-hidden transition-all duration-200 border-0 sm:border', engaging ? 'shadow-sm hover:shadow-md' : 'shadow-none')}>
      <CardHeader
        className={cn(
          'border-b bg-gradient-to-r from-muted/50 to-muted/20 pb-4',
          engaging ? 'px-6' : 'p-4'
        )}
      >
        <div className={cn("flex flex-wrap items-center justify-between gap-3", isRTL ? "flex-row" : "flex-row")}>
          <div className={cn("space-y-1 min-w-0", isRTL ? "text-right order-last" : "text-left order-first")}>
            <h2 className="text-xl font-semibold tracking-tight text-foreground truncate">
              {localizedFormName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('client.fill.stepOf').replace('{step}', String(stepIndex + 1)).replace('{total}', String(totalSteps))}
            </p>
          </div>

          <div className={cn("flex items-center gap-2 flex-wrap shrink-0", isRTL ? "flex-row order-first" : "flex-row order-last")}>
            {headerActions}
            {saveIndicator === 'saving' && (
              <span className={cn("inline-flex items-center text-xs text-muted-foreground bg-background/80 border rounded-full px-2.5 py-1 gap-1", isRTL && "flex-row-reverse")}>
                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                {isRTL ? 'جارٍ الحفظ…' : 'Saving…'}
              </span>
            )}
            {saveIndicator === 'saved' && (
              <span className={cn("inline-flex items-center text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1 gap-1", isRTL && "flex-row-reverse")}>
                <Check className="h-3 w-3" />
                {t('client.fill.updated')}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('p-4 sm:p-6 space-y-4', isRTL ? 'text-right' : 'text-left')}>
        {approvalStatus === 'APPROVED' && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-sm font-semibold">{t('client.fill.stepApproved')}</AlertTitle>
            <AlertDescription className="text-xs">
              {t('client.fill.stepApprovedDesc')}
            </AlertDescription>
          </Alert>
        )}

        {approvalStatus === 'REJECTED' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">{t('client.fill.changesRequested')}</AlertTitle>
            <AlertDescription className="text-xs">
              {rejectionNote?.trim()
                ? rejectionNote
                : t('client.fill.changesRequestedDesc')}
            </AlertDescription>
          </Alert>
        )}

        <div className={cn('space-y-3', engaging && 'space-y-4')}>
          {fields.map((field, idx) => {
            const displayLabel = getLocalizedText(field.label, locale)
            const displayHelpText = getLocalizedText(field.helpText, locale)

            if (field.type === 'INSTRUCTION') {
              return (
                <div
                  key={field.fieldId}
                  className={cn(
                    'rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5',
                    engaging && 'shadow-sm',
                    isRTL ? 'text-right' : 'text-left'
                  )}
                >
                  <div className={cn("flex items-start gap-2.5", isRTL ? "flex-row-reverse" : "flex-row")}>
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-[10px] font-semibold">
                      i
                    </span>
                    <div className="min-w-0 space-y-1">
                      {displayLabel?.trim() && (
                        <p className="text-sm font-semibold text-sky-950">{displayLabel}</p>
                      )}
                      {displayHelpText?.trim() ? (
                        <p className="text-sm text-sky-900/90 whitespace-pre-wrap leading-relaxed">
                          {displayHelpText}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={field.fieldId}
                className={cn(
                  'space-y-1.5 rounded-xl border p-3.5 transition-shadow',
                  isRTL ? 'text-right' : 'text-left',
                  engaging
                    ? 'bg-white dark:bg-card shadow-sm'
                    : 'bg-card'
                )}
              >
                <Label className={cn('inline-flex items-center gap-1.5', engaging ? 'text-sm font-medium' : 'text-sm', isRTL ? 'flex-row justify-start w-full' : 'flex-row')}>
                  <span className="text-muted-foreground/70 text-xs font-normal">
                    {idx + 1}.
                  </span>
                  <span>{displayLabel}</span>
                  {field.isRequired && <span className="text-destructive">*</span>}
                  <FieldHelpTooltip text={displayHelpText} />
                </Label>

                {field.type === 'TEXTAREA' ? (
                  <Textarea
                    value={values[field.fieldId] ?? ''}
                    onChange={(e) => setValue(field.fieldId, e.target.value)}
                    placeholder={field.placeholder || undefined}
                    disabled={readOnly}
                    rows={4}
                    className={cn(isRTL ? 'text-right' : 'text-left', engaging ? 'disabled:opacity-80 disabled:cursor-not-allowed focus-visible:ring-emerald-500 disabled:bg-gray-100' : undefined)}
                  />
                ) : field.type === 'SELECT' || field.type === 'RADIO' ? (
                  <Select
                    value={values[field.fieldId] ?? ''}
                    onValueChange={(val) => setValue(field.fieldId, val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className={cn("h-10", isRTL ? "text-right" : "text-left")}>
                      <SelectValue placeholder={field.placeholder || "Select option"} />
                    </SelectTrigger>
                    <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'CHECKBOX' ? (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  checked={values[field.fieldId] === 'true'}
                  onCheckedChange={(checked) =>
                    setValue(field.fieldId, checked ? 'true' : 'false')
                  }
                  disabled={readOnly}
                />
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
            ) : field.type === 'FILE' ? (
              <div className="space-y-2">
                {values[field.fieldId] ? (
                  <WizardFilePreview
                    fileUrl={values[field.fieldId]}
                    fileName={fileNames[field.fieldId]}
                    onRemove={!readOnly ? () => handleRemoveFile(field.fieldId) : undefined}
                  />
                ) : (
                  <FileInput
                    id={field.fieldId}
                    disabled={readOnly || uploadingFieldId === field.fieldId}
                    onChange={(e) => void handleFileUpload(field.fieldId, e.target.files?.[0])}
                  />
                )}
                {uploadingFieldId === field.fieldId && (
                  <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", isRTL && "flex-row-reverse")}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    <span>Uploading file…</span>
                  </div>
                )}
              </div>
            ) : (
              <Input
                type={
                  field.type === 'NUMBER'
                    ? 'number'
                    : field.type === 'EMAIL'
                      ? 'email'
                      : field.type === 'DATE'
                        ? 'date'
                        : field.type === 'PHONE'
                          ? 'tel'
                          : 'text'
                }
                value={values[field.fieldId] ?? ''}
                onChange={(e) => setValue(field.fieldId, e.target.value)}
                placeholder={field.placeholder || undefined}
                disabled={readOnly}
                className={cn(isRTL ? 'text-right' : 'text-left', engaging ? 'focus-visible:ring-emerald-500 h-10 disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-gray-100' : undefined)}
              />
            )}

            {errors[field.fieldId] && (
              <p className={cn("text-xs text-destructive", isRTL ? "text-right" : "text-left")}>{errors[field.fieldId]}</p>
            )}
          </div>
          )
        })}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No fields on this form step.
          </p>
        )}
      </div>

      {!readOnly && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 pt-2 border-t',
            isRTL ? 'flex-row-reverse' : 'flex-row',
            engaging && 'pt-4'
          )}
        >
          <div className={cn("flex gap-2", isRTL ? "flex-row-reverse" : "flex-row")}>
            {onBack && stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={onBack} disabled={saving} className="cursor-pointer">
                {isRTL ? <ArrowRight className="h-4 w-4 ml-1" /> : <ArrowLeft className="h-4 w-4 mr-1" />}
                {t('admin.wizards.modal.back')}
              </Button>
            )}
            {onSaveAndExit && (
              <Button type="button" variant="outline" onClick={handleSaveExit} disabled={saving} className="cursor-pointer">
                <Save className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
                {t('client.fill.saveAsDraft')}
              </Button>
            )}
          </div>
          <Button
            type="button"
            className={cn(
              'min-w-[140px]',
              engaging && 'bg-emerald-700 hover:bg-emerald-800 shadow-sm cursor-pointer'
            )}
            onClick={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
            ) : isLastStep && showSubmit ? (
              <Check className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            ) : isRTL ? (
              <ArrowLeft className="h-4 w-4 ml-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {isLastStep && showSubmit
              ? allowSubmit === false
                ? t('client.fill.completeApprovalsToSubmit')
                : t('client.fill.submitApplication')
              : allowStepAdvance === false
                ? t('client.fill.saveForAdminReview')
                : t('client.fill.saveAndContinue')}
          </Button>
        </div>
      )}
      </CardContent>
    </Card>
  </div>
)
}
