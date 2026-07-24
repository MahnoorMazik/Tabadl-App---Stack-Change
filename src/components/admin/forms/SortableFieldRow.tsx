'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { GripVertical, Trash2 } from 'lucide-react'
import { FormField, FIELD_TYPE_LABELS } from './types'

interface SortableFieldRowProps {
  field: FormField
  onUpdate: (id: string, patch: Partial<FormField>) => void
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border bg-card p-3
        ${isDragging ? 'opacity-80 shadow-md z-10' : ''}
      `}
    >
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
          onChange={(e) => onUpdate(field.id, { label: e.target.value })}
          placeholder="Field label"
          className="h-8"
        />
      </div>

      <Badge variant="secondary" className="shrink-0 self-start sm:self-center">
        {FIELD_TYPE_LABELS[field.type]}
      </Badge>

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
  )
}
