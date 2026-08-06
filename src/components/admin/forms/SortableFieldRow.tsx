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
import { parseBilingualText, encodeBilingualText } from '@/lib/multilingual-text'

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
  const parsedLabel = parseBilingualText(field.label)
  const parsedHelp = parseBilingualText(field.helpText)

  const handleLabelChange = (en: string, ar: string) => {
    const encoded = encodeBilingualText(en, ar)
    onUpdate(field.id, {
      label: encoded,
      labelOverride: encoded,
    })
  }

  const handleHelpChange = (en: string, ar: string) => {
    const encoded = (en.trim() || ar.trim()) ? encodeBilingualText(en, ar) : null
    onUpdate(field.id, { helpText: encoded })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex flex-col gap-2.5 rounded-lg border bg-card p-3
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

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            value={parsedLabel.en}
            onChange={(e) => handleLabelChange(e.target.value, parsedLabel.ar)}
            placeholder={isInstruction ? 'Heading (English)' : 'Field label (English)'}
            className="h-8 text-xs"
          />
          <Input
            value={parsedLabel.ar}
            onChange={(e) => handleLabelChange(parsedLabel.en, e.target.value)}
            placeholder={isInstruction ? 'العنوان (بالعربية)' : 'اسم الحقل (بالعربية)'}
            dir="rtl"
            className="h-8 text-xs text-right"
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

      <div className="sm:pl-8 space-y-1.5">
        {isInstruction ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-normal text-muted-foreground">Instruction text (English)</Label>
              <Textarea
                value={parsedHelp.en}
                onChange={(e) => handleHelpChange(e.target.value, parsedHelp.ar)}
                placeholder="Guidance in English…"
                rows={2}
                className="text-xs resize-y min-h-[50px]"
              />
            </div>
            <div>
              <Label className="text-[11px] font-normal text-muted-foreground block text-right">نص الإرشادات (بالعربية)</Label>
              <Textarea
                value={parsedHelp.ar}
                onChange={(e) => handleHelpChange(parsedHelp.en, e.target.value)}
                placeholder="الإرشادات بالعربية..."
                rows={2}
                dir="rtl"
                className="text-xs resize-y min-h-[50px] text-right"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-normal text-muted-foreground">Tooltip (English)</Label>
              <Input
                value={parsedHelp.en}
                onChange={(e) => handleHelpChange(e.target.value, parsedHelp.ar)}
                placeholder="Help message in English…"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-normal text-muted-foreground block text-right">تلميح توضيحي (بالعربية)</Label>
              <Input
                value={parsedHelp.ar}
                onChange={(e) => handleHelpChange(parsedHelp.en, e.target.value)}
                placeholder="نص توضيحي بالعربية..."
                dir="rtl"
                className="h-7 text-xs text-right"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
