'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'
import { formApi } from '@/components/admin/forms/api'
import { FormPreview } from '@/components/admin/forms/FormPreview'
import { CanvasField, mapApiTemplateDetail } from '@/components/admin/forms/types'
import { WizardListItem } from './types'
import { cn } from '@/lib/utils'

interface WizardPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wizard: WizardListItem | null
}

type Phase = 'form' | 'payment' | 'done'

export function WizardPreviewModal({
  open,
  onOpenChange,
  wizard,
}: WizardPreviewModalProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('form')
  const [fields, setFields] = useState<CanvasField[]>([])
  const [formName, setFormName] = useState('')
  const [loadingForm, setLoadingForm] = useState(false)

  const steps = wizard?.steps ?? []
  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex >= steps.length - 1

  useEffect(() => {
    if (!open) {
      setStepIndex(0)
      setPhase('form')
      setFields([])
      setFormName('')
      return
    }
    setStepIndex(0)
    setPhase('form')
  }, [open, wizard?.id])

  useEffect(() => {
    if (!open || !currentStep || phase !== 'form') return

    let cancelled = false

    const load = async () => {
      setLoadingForm(true)
      try {
        const res = await formApi.getTemplate(currentStep.formTemplateId)
        if (cancelled) return
        const detail = mapApiTemplateDetail(res.template)
        setFields(detail.fields)
        setFormName(detail.name)
      } catch {
        if (cancelled) return
        setFields([])
        setFormName(currentStep.formName)
      } finally {
        if (!cancelled) setLoadingForm(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, currentStep, phase, stepIndex])

  const progressLabel = useMemo(() => {
    if (!wizard || steps.length === 0) return ''
    if (phase === 'done') return 'Complete'
    return `Step ${stepIndex + 1} of ${steps.length}`
  }, [wizard, steps.length, stepIndex, phase])

  const goNextStep = () => {
    if (isLastStep) {
      setPhase('done')
      return
    }
    setStepIndex((i) => i + 1)
    setPhase('form')
  }

  const handleFormContinue = () => {
    if (currentStep?.paymentRequired) {
      setPhase('payment')
      return
    }
    goNextStep()
  }

  const handleBack = () => {
    if (phase === 'payment') {
      setPhase('form')
      return
    }
    if (phase === 'form' && stepIndex > 0) {
      setStepIndex((i) => i - 1)
      setPhase('form')
    }
  }

  if (!wizard) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{wizard.name || 'Application wizard preview'}</DialogTitle>
          <DialogDescription>
            How this flow appears for the client — forms and payment steps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{wizard.areaOfInterest}</Badge>
            {wizard.serviceNames.slice(0, 2).map((name) => (
              <Badge key={name} variant="outline" className="font-normal">
                {name}
              </Badge>
            ))}
            {wizard.serviceNames.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{wizard.serviceNames.length - 2} services
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{progressLabel}</span>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {steps.map((step, index) => {
              const active = phase !== 'done' && index === stepIndex
              const completed = phase === 'done' || index < stepIndex
              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex min-w-[7rem] flex-1 flex-col rounded-md border px-2.5 py-2 text-left',
                    active && 'border-emerald-600 bg-emerald-50',
                    completed && !active && 'border-emerald-200 bg-emerald-50/40',
                    !active && !completed && 'bg-muted/30'
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Step {index + 1}
                  </span>
                  <span className="truncate text-xs font-medium">{step.formName}</span>
                  {step.paymentRequired && (
                    <span className="mt-0.5 text-[10px] text-amber-700">+ Payment</span>
                  )}
                </div>
              )
            })}
          </div>

          {phase === 'done' ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <div>
                <p className="font-medium">Application steps complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Client has finished all forms
                  {steps.some((s) => s.paymentRequired) ? ' and payments' : ''}.
                </p>
              </div>
            </div>
          ) : phase === 'payment' && currentStep ? (
            <div className="space-y-4 rounded-lg border p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-amber-50 p-2">
                  <CreditCard className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="font-medium">Payment required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Client must complete payment before continuing from{' '}
                    <span className="font-medium text-foreground">{currentStep.formName}</span>.
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-3 text-sm space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Step</span>
                  <span className="text-right">
                    {stepIndex + 1} — {currentStep.formName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">Awaiting payment</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {currentStep?.paymentRequired && (
                <div className="flex justify-end">
                  <Badge variant="secondary" className="text-[10px]">
                    Payment after submit
                  </Badge>
                </div>
              )}
              {loadingForm ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="rounded-md border p-4">
                  <FormPreview
                    formName={formName || currentStep?.formName || 'Form'}
                    fields={fields}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {phase === 'done' ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={phase === 'form' && stepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {phase === 'payment' ? (
                <Button
                  type="button"
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={goNextStep}
                >
                  Pay & continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={handleFormContinue}
                  disabled={loadingForm}
                >
                  {currentStep?.paymentRequired
                    ? 'Continue to payment'
                    : isLastStep
                      ? 'Finish'
                      : 'Continue'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
