'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GripVertical, Trash2, Pencil } from 'lucide-react'
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
  usedFormIds: _usedFormIds,
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

  const selectedForm = formsForArea.find((f) => f.id === step.formTemplateId)
  const displayName =
    selectedForm?.name ??
    step.formName ??
    (step.formTemplateId ? 'Unknown form' : '')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-white dark:bg-card p-3.5 space-y-3 shadow-sm ${
        isDragging ? 'opacity-80 shadow-md z-10 ring-1 ring-border' : ''
      }`}
    >
      <div className="flex items-center gap-2">
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

        <div className="flex flex-1 items-center justify-end gap-3 flex-wrap">
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

      <div className="w-full sm:w-1/2 space-y-1.5">
        <Label className="text-sm font-medium">Form</Label>
        <Input
          value={displayName}
          disabled
          readOnly
          placeholder="No form assigned"
          className="bg-muted/80 text-muted-foreground cursor-not-allowed disabled:opacity-80 disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border/60">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`payment-${step.id}`}
            checked={step.paymentRequired}
            onCheckedChange={(checked) =>
              onUpdate(step.id, { paymentRequired: checked === true })
            }
          />
          <Label
            htmlFor={`payment-${step.id}`}
            className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
          >
            Payment required
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id={`approval-${step.id}`}
            checked={step.approvalRequired}
            onCheckedChange={(checked) =>
              onUpdate(step.id, { approvalRequired: checked === true })
            }
          />
          <Label
            htmlFor={`approval-${step.id}`}
            className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
          >
            Approval required
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id={`admin-use-${step.id}`}
            checked={Boolean(step.adminUseOnly)}
            onCheckedChange={(checked) =>
              onUpdate(step.id, { adminUseOnly: checked === true })
            }
          />
          <Label
            htmlFor={`admin-use-${step.id}`}
            className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
          >
            Admin Use Only
          </Label>
        </div>
      </div>
    </div>
  )
}
