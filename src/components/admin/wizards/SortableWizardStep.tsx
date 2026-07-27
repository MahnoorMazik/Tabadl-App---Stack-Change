'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GripVertical, Trash2 } from 'lucide-react'
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
}

export function SortableWizardStep({
  step,
  index,
  canRemove,
  formsForArea,
  usedFormIds,
  onUpdate,
  onRemove,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border p-3 space-y-3 bg-card ${
        isDragging ? 'opacity-80 shadow-md z-10' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 -ml-1 shrink-0"
            aria-label={`Drag to reorder step ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium">Step {index + 1}</p>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(step.id)}
            aria-label={`Remove step ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Form</Label>
        <Select
          value={step.formTemplateId || undefined}
          onValueChange={(value) => onUpdate(step.id, { formTemplateId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a form template" />
          </SelectTrigger>
          <SelectContent>
            {formsForArea.length === 0 ? (
              <SelectItem value="__none" disabled>
                No forms available for this area
              </SelectItem>
            ) : (
              formsForArea.map((form) => {
                const taken =
                  usedFormIds.includes(form.id) && form.id !== step.formTemplateId
                return (
                  <SelectItem key={form.id} value={form.id} disabled={taken}>
                    {form.name}
                    {form.areaOfInterest ? ` (${form.areaOfInterest})` : ''}
                    {taken ? ' — already used' : ''}
                  </SelectItem>
                )
              })
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
        <div>
          <Label
            htmlFor={`payment-${step.id}`}
            className="font-normal cursor-pointer"
          >
            Payment required
          </Label>
          <p className="text-xs text-muted-foreground">
            Client must pay after submitting this form
          </p>
        </div>
        <Switch
          id={`payment-${step.id}`}
          checked={step.paymentRequired}
          onCheckedChange={(checked) =>
            onUpdate(step.id, { paymentRequired: checked })
          }
        />
      </div>
    </div>
  )
}
