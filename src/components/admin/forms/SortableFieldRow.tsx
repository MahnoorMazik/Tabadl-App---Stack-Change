'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { GripVertical, Trash2 } from 'lucide-react'
import { CanvasField, FIELD_TYPE_LABELS, isDisplayOnlyFieldType } from './types'

interface SortableFieldRowProps {
  field: CanvasField
  onUpdate: (id: string, patch: Partial<CanvasField>) => void
  onRemove: (id: string) => void
}

export function SortableFieldRow({ field, onUpdate, onRemove }: SortableFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isInstruction = isDisplayOnlyFieldType(field.type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex flex-col gap-2 rounded-lg border bg-card p-3
        ${isDragging ? 'opacity-80 shadow-md z-10' : ''}
        ${isInstruction ? 'border-sky-200 bg-sky-50/40' : ''}
      `}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="self-start sm:self-center cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 -ml-1"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <Input
            value={field.label}
            onChange={(e) =>
              onUpdate(field.id, {
                label: e.target.value,
                labelOverride: e.target.value,
              })
            }
            placeholder={isInstruction ? 'Instruction heading' : 'Field label'}
            className="h-8"
          />
        </div>

        <Badge
          variant="secondary"
          className={`shrink-0 self-start sm:self-center ${
            isInstruction ? 'bg-sky-100 text-sky-800 border border-sky-200' : ''
          }`}
        >
          {FIELD_TYPE_LABELS[field.type]}
        </Badge>

        {!isInstruction && (
          <div className="flex items-center gap-2 shrink-0">
            <Checkbox
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) =>
                onUpdate(field.id, { required: checked === true })
              }
            />
            <Label
              htmlFor={`required-${field.id}`}
              className="text-xs font-normal text-muted-foreground cursor-pointer"
            >
              Required
            </Label>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onRemove(field.id)}
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="sm:pl-8 space-y-1">
        {isInstruction ? (
          <>
            <Label
              htmlFor={`instruction-${field.id}`}
              className="text-xs font-normal text-muted-foreground"
            >
              Instruction text (shown on the form)
            </Label>
            <Textarea
              id={`instruction-${field.id}`}
              value={field.helpText ?? ''}
              onChange={(e) => onUpdate(field.id, { helpText: e.target.value })}
              placeholder="Write the guidance or instructions applicants should read…"
              rows={3}
              className="text-sm resize-y min-h-[72px]"
            />
          </>
        ) : (
          <>
            <Label
              htmlFor={`tooltip-${field.id}`}
              className="text-xs font-normal text-muted-foreground"
            >
              Tooltip (shown on ? hover)
            </Label>
            <Input
              id={`tooltip-${field.id}`}
              value={field.helpText ?? ''}
              onChange={(e) => onUpdate(field.id, { helpText: e.target.value })}
              placeholder="Optional help message for applicants…"
              className="h-8 text-sm"
            />
          </>
        )}
      </div>
    </div>
  )
}
