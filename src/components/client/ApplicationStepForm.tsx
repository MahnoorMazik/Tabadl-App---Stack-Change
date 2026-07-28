'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { CanvasField } from '@/components/admin/forms/types'

type AnswerMap = Record<string, string>

interface ApplicationStepFormProps {
  stepId: string
  stepNumber: number
  totalSteps: number
  formName: string
  fields: CanvasField[]
  initialAnswers?: AnswerMap
  isAdminActingOnBehalf?: boolean
  onBack?: () => void
  onNext?: () => void
  onSaveExit?: () => void
}

export function ApplicationStepForm({
  stepId,
  stepNumber,
  totalSteps,
  formName,
  fields,
  initialAnswers = {},
  isAdminActingOnBehalf = false,
  onBack,
  onNext,
  onSaveExit,
}: ApplicationStepFormProps) {
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setAnswers(initialAnswers)
  }, [initialAnswers, stepId])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      try {
        const endpoint = isAdminActingOnBehalf
          ? '/api/admin/application/answers'
          : '/api/client/application/answers'
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ stepId, answers }),
        })
        setSaved(true)
      } catch {
        // Keep local state if backend endpoint is unavailable.
      } finally {
        setSaving(false)
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [answers, stepId, isAdminActingOnBehalf])

  const isLast = stepNumber >= totalSteps
  const canNext = useMemo(
    () => fields.every((f) => !f.required || Boolean(answers[f.id]?.trim())),
    [fields, answers]
  )

  const update = (fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Step {stepNumber} of {totalSteps}
          </p>
          <h3 className="font-semibold">{formName}</h3>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
          <span>{saved ? 'Saved' : saving ? 'Saving…' : 'Auto-save'}</span>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={`f-${field.id}`}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            {field.type === 'TEXTAREA' ? (
              <Textarea
                id={`f-${field.id}`}
                value={answers[field.id] ?? ''}
                onChange={(e) => update(field.id, e.target.value)}
              />
            ) : field.type === 'SELECT' && field.options?.length ? (
              <Select value={answers[field.id] ?? ''} onValueChange={(v) => update(field.id, v)}>
                <SelectTrigger id={`f-${field.id}`}>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`f-${field.id}`}
                type={field.type === 'EMAIL' ? 'email' : field.type === 'NUMBER' ? 'number' : 'text'}
                value={answers[field.id] ?? ''}
                onChange={(e) => update(field.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack} disabled={stepNumber === 1}>
            Back
          </Button>
          <Button variant="outline" onClick={onSaveExit}>
            Save & exit
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isAdminActingOnBehalf && <Badge variant="secondary">Admin acting on behalf</Badge>}
          <Button onClick={onNext} disabled={!canNext}>
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}

