'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { GripVertical, Trash2, CreditCard, Pencil } from 'lucide-react'
import { FormTemplateListItem } from '@/components/admin/forms/types'
import { WizardStepDraft } from './types'

interface SortableWizardStepProps {
  step: WizardStepDraft
  index: number
  canRemove: boolean
  formsForArea: FormTemplateListItem[]
  usedFormIds: string[]
  onUpdate: (stepId: string, patch: Partial<WizardStepDraft>) => void
  onRemove: (stepId: string) => void
  onEditForm?: (formTemplateId: string) => void
}

export function SortableWizardStep({
  step,
  index,
  canRemove,
  formsForArea,
  usedFormIds,
  onUpdate,
  onRemove,
  onEditForm,
}: SortableWizardStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Resolve form name from formsForArea or stored formName on the draft
  const selectedForm = formsForArea.find((f) => f.id === step.formTemplateId)
  const displayName =
    selectedForm?.name ??
    (step as any).formName ??
    (step.formTemplateId ? 'Unknown form' : '')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border border-border p-3 space-y-3 bg-card ${
        isDragging ? 'opacity-80 shadow-md z-10 ring-1 ring-border' : ''
      }`}
    >
      {/* Header row: drag handle + Step N | right controls */}
      <div className="flex items-center gap-2">
        {/* Left: drag + label */}
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 -ml-1 shrink-0 rounded-sm hover:bg-muted/60 transition-colors"
            aria-label={`Drag to reorder step ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium">Step {index + 1}</p>
        </div>

        {/* Right: Edit Form | Is payment required + toggle | trash */}
        <div className="flex flex-1 items-center justify-end gap-3 flex-wrap">
          {/* Edit Form button */}
          {step.formTemplateId && onEditForm && (
            <button
              type="button"
              onClick={() => onEditForm(step.formTemplateId)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:underline hover:text-emerald-600 transition-colors duration-200 cursor-pointer"
              aria-label={`Edit form for step ${index + 1}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Form
            </button>
          )}

          {/* Payment required */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`payment-${step.id}`}
              className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
            >
              Is payment required
            </Label>
            <Switch
              id={`payment-${step.id}`}
              checked={step.paymentRequired}
              onCheckedChange={(checked) =>
                onUpdate(step.id, { paymentRequired: checked })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Label
              htmlFor={`approval-${step.id}`}
              className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
            >
              Approval required
            </Label>
            <Switch
              id={`approval-${step.id}`}
              checked={step.approvalRequired}
              onCheckedChange={(checked) =>
                onUpdate(step.id, { approvalRequired: checked })
              }
            />
          </div>

          {/* Delete */}
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onRemove(step.id)}
              aria-label={`Remove step ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Form — disabled read-only input showing the form name */}
      <div className="w-1/2 space-y-1.5">
        <Label className="text-sm font-medium">Form</Label>
        <Input
          value={displayName}
          disabled
          readOnly
          placeholder="No form assigned"
          className="bg-muted/80 text-muted-foreground cursor-not-allowed disabled:opacity-80 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  )
}
