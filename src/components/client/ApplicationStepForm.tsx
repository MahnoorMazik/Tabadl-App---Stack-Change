'use client'

import { useEffect, useRef, useState } from 'react'
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
  saveExitLabel = 'Save & exit',
  showSubmit = true,
  engaging = false,
  headerActions,
  allowStepAdvance = true,
  allowSubmit = true,
}: ApplicationStepFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const initialized = useRef(false)

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const field of fields) {
      initial[field.fieldId] = field.answer?.value ?? field.answer?.fileUrl ?? ''
    }
    setValues(initial)
    setErrors({})
    initialized.current = true
  }, [fields])

  const setValue = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    setErrors((prev) => {
      if (!prev[fieldId]) return prev
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    for (const field of fields) {
      if (field.isRequired && !String(values[field.fieldId] ?? '').trim()) {
        nextErrors[field.fieldId] = 'Required'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleContinue = async () => {
    if (!validate()) return
    const canAdvance = allowStepAdvance !== false
    const canSubmitNow = allowSubmit !== false
    await onSave?.(values, {
      goNext: canAdvance && !isLastStep,
      submit: Boolean(isLastStep && showSubmit && canSubmitNow),
    })
  }

  const handleSaveExit = async () => {
    await onSaveAndExit?.(values)
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
                className="text-[10px] border-sky-200 bg-sky-50 text-sky-800"
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin approval
              </Badge>
            )}
            {paymentRequired && (
              <Badge className="text-[10px] bg-violet-100 text-violet-800 hover:bg-violet-100 border border-violet-200">
                Payment after this step
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
                ? 'bg-white dark:bg-card border-emerald-100/80 shadow-sm hover:shadow-md hover:border-emerald-200'
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
                className={engaging ? 'border-emerald-100 focus-visible:ring-emerald-500' : undefined}
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
                  className={engaging ? 'border-emerald-100 focus-visible:ring-emerald-500' : undefined}
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
                className={engaging ? 'border-emerald-100 focus-visible:ring-emerald-500 h-10' : undefined}
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
              <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {onSaveAndExit && (
              <Button type="button" variant="outline" onClick={handleSaveExit} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saveExitLabel}
              </Button>
            )}
          </div>
          <Button
            type="button"
            className={cn(
              'min-w-[140px]',
              engaging && 'bg-emerald-700 hover:bg-emerald-800 shadow-sm'
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
