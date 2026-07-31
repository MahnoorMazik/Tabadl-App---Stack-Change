'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export interface StepField {
  id: string
  required: boolean
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
  onSave?: (answers: Record<string, string>, opts?: { goNext?: boolean; submit?: boolean }) => void | Promise<void>
  onSaveAndExit?: (answers: Record<string, string>) => void | Promise<void>
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
}: ApplicationStepFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const valuesRef = useRef<Record<string, string>>({})
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
    for (const field of fieldsRef.current) {
      initial[field.fieldId] = field.answer?.value ?? field.answer?.fileUrl ?? ''
    }
    syncValues(initial, true)
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
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  const getCurrentValues = () => ({ ...valuesRef.current })

  const validate = (currentValues: Record<string, string>) => {
    const nextErrors: Record<string, string> = {}
    for (const field of fields) {
      if (field.isRequired && !String(currentValues[field.fieldId] ?? '').trim()) {
        nextErrors[field.fieldId] = 'Required'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleContinue = async () => {
    const currentValues = getCurrentValues()
    const canAdvance = allowStepAdvance !== false && !isLastStep
    const canSubmitNow = allowSubmit !== false
    const wantsSubmit = Boolean(isLastStep && showSubmit && canSubmitNow)
    const mustValidate = canAdvance || wantsSubmit || Boolean(approvalRequired)

    if (mustValidate && !validate(currentValues)) return

    await onSave?.(currentValues, {
      goNext: canAdvance,
      submit: wantsSubmit,
    })
  }

  const handleSaveExit = async () => {
    await onSaveAndExit?.(getCurrentValues())
  }

  const progressPct = totalSteps > 0 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0

  return (
    <div className={cn('space-y-5', engaging && 'space-y-6')}>
      <div
        className={cn(
          'rounded-xl border px-4 py-3',
          engaging
            ? 'border-emerald-200 bg-linear-to-r from-emerald-50 via-white to-sky-50 dark:from-emerald-950/30 dark:via-card dark:to-sky-950/20 shadow-sm'
            : 'bg-muted/30'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className={cn('font-semibold', engaging ? 'text-base text-emerald-900 dark:text-emerald-100' : 'text-sm')}>
              {formName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {stepIndex + 1} of {totalSteps}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {approvalRequired && (
              <Badge
                variant="outline"
                className="text-[12px] border border-sky-300 bg-sky-100 text-sky-800"
              >
                Admin Approval
              </Badge>
            )}
            {paymentRequired && (
              <Badge className="text-[12px] bg-violet-100 text-violet-800 border border-violet-300">
                Payment Required
              </Badge>
            )}
            {saveIndicator === 'saving' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </span>
            )}
            {saveIndicator === 'saved' && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            {headerActions}
          </div>
        </div>
        {engaging && (
          <div className="mt-3 h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {approvalRequired && approvalStatus === 'PENDING' && readOnly && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <Clock className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Pending approval from admin</AlertTitle>
          <AlertDescription className="text-xs text-amber-900/90">
            Your answers are saved and locked until an admin reviews this step.
          </AlertDescription>
        </Alert>
      )}

      {approvalRequired && approvalStatus === 'APPROVED' && readOnly && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <Check className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Step approved</AlertTitle>
          <AlertDescription className="text-xs text-emerald-900/90">
            This step was approved by admin. Fields stay locked so approved data cannot be changed.
          </AlertDescription>
        </Alert>
      )}

      {approvalRequired && approvalStatus === 'REJECTED' && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950 [&>svg]:text-red-600">
          <AlertTitle className="text-sm font-semibold">Changes requested</AlertTitle>
          <AlertDescription className="text-xs">
            {rejectionNote?.trim()
              ? rejectionNote
              : 'Admin rejected this step. Update the fields and save again for review.'}
          </AlertDescription>
        </Alert>
      )}

      <div className={cn('space-y-3', engaging && 'space-y-4')}>
        {fields.map((field, idx) => (
          <div
            key={field.fieldId}
            className={cn(
              'space-y-1.5 rounded-xl border p-3.5 transition-shadow',
              engaging
                ? 'bg-white dark:bg-card shadow-sm'
                : 'bg-card'
            )}
          >
            <Label className={cn(engaging ? 'text-sm font-medium' : 'text-sm')}>
              <span className="text-muted-foreground/70 mr-1.5 text-xs font-normal">
                {idx + 1}.
              </span>
              {field.label}
              {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}

            {field.type === 'TEXTAREA' ? (
              <Textarea
                value={values[field.fieldId] ?? ''}
                onChange={(e) => setValue(field.fieldId, e.target.value)}
                placeholder={field.placeholder || undefined}
                disabled={readOnly}
                rows={4}
                className={engaging ? 'disabled:opacity-80 disabled:cursor-not-allowed focus-visible:ring-emerald-500 disabled:bg-gray-100' : undefined}
              />
            ) : field.type === 'SELECT' || field.type === 'RADIO' ? (
              <Select
                value={values[field.fieldId] || undefined}
                onValueChange={(v) => setValue(field.fieldId, v)}
                disabled={readOnly}
              >
                <SelectTrigger className={engaging ? 'border-emerald-100' : undefined}>
                  <SelectValue placeholder={field.placeholder || 'Select…'} />
                </SelectTrigger>
                <SelectContent>
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
                <Input
                  type="text"
                  value={values[field.fieldId] ?? ''}
                  onChange={(e) => setValue(field.fieldId, e.target.value)}
                  placeholder="File URL or path"
                  disabled={readOnly}
                  className={engaging ? 'focus-visible:ring-emerald-500 disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-gray-100' : undefined}
                />
                {!readOnly && (
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setValue(field.fieldId, file.name)
                    }}
                  />
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
                className={engaging ? 'focus-visible:ring-emerald-500 h-10 disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-gray-100' : undefined}
              />
            )}

            {errors[field.fieldId] && (
              <p className="text-xs text-destructive">{errors[field.fieldId]}</p>
            )}
          </div>
        ))}

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
            engaging && 'pt-4'
          )}
        >
          <div className="flex gap-2">
            {onBack && stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={onBack} disabled={saving} className='cursor-pointer'>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {onSaveAndExit && (
              <Button type="button" variant="outline" onClick={handleSaveExit} disabled={saving} className='cursor-pointer'>
                <Save className="h-4 w-4 mr-1" />
                {/* {saveExitLabel} */}
                Save as Draft
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isLastStep && showSubmit ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {isLastStep && showSubmit
              ? allowSubmit === false
                ? 'Complete approvals to submit'
                : 'Submit application'
              : allowStepAdvance === false
                ? 'Save for admin review'
                : 'Save & continue'}
          </Button>
        </div>
      )}
    </div>
  )
}
