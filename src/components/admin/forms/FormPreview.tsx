'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from './types'

interface FormPreviewProps {
  formName: string
  fields: FormField[]
}

function PreviewControl({ field }: { field: FormField }) {
  const id = `preview-${field.id}`

  switch (field.type) {
    case 'long_text':
      return <Textarea id={id} disabled placeholder="Enter text…" className="resize-none" rows={3} />
    case 'number':
      return <Input id={id} type="number" disabled placeholder="0" />
    case 'email':
      return <Input id={id} type="email" disabled placeholder="name@example.com" />
    case 'phone':
      return <Input id={id} type="tel" disabled placeholder="+966…" />
    case 'date':
      return <Input id={id} type="date" disabled />
    case 'dropdown':
      return (
        <Select disabled>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? ['Option 1', 'Option 2']).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox id={id} disabled />
          <Label htmlFor={id} className="font-normal text-muted-foreground">
            {field.label || 'Checkbox option'}
          </Label>
        </div>
      )
    case 'file':
      return <Input id={id} type="file" disabled className="cursor-not-allowed" />
    case 'text':
    default:
      return <Input id={id} type="text" disabled placeholder="Enter text…" />
  }
}

export function FormPreview({ formName, fields }: FormPreviewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {formName.trim() || 'Untitled Form'}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Live preview · read-only</p>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add fields to see a preview of the client form.
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              {field.type !== 'checkbox' && (
                <Label htmlFor={`preview-${field.id}`} className="text-sm">
                  {field.label || 'Untitled field'}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
              )}
              <PreviewControl field={field} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
