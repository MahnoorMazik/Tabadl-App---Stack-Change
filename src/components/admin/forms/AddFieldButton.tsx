'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Library } from 'lucide-react'
import {
  FormFieldType,
  FIELD_TYPE_LABELS,
  MOCK_REUSABLE_FIELDS,
  ReusableField,
  createFieldFromType,
  createFieldFromReusable,
  FormField,
} from './types'

interface AddFieldButtonProps {
  type: FormFieldType
  onAdd: (field: FormField) => void
}

export function AddFieldButton({ type, onAdd }: AddFieldButtonProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'choose' | 'create' | 'library'>('choose')
  const [newLabel, setNewLabel] = useState('')

  const libraryMatches = useMemo(
    () => MOCK_REUSABLE_FIELDS.filter((f) => f.type === type),
    [type]
  )

  const reset = () => {
    setMode('choose')
    setNewLabel('')
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const handleCreate = () => {
    const label = newLabel.trim() || FIELD_TYPE_LABELS[type]
    onAdd(createFieldFromType(type, label))
    handleOpenChange(false)
  }

  const handleSelectReusable = (field: ReusableField) => {
    onAdd(createFieldFromReusable(field))
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="justify-start gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {FIELD_TYPE_LABELS[type]}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {mode === 'choose' && (
          <div className="p-3 space-y-2">
            <p className="text-sm font-medium">Add {FIELD_TYPE_LABELS[type]} field</p>
            <p className="text-xs text-muted-foreground">
              Create a new field or reuse one from the library.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={() => setMode('create')}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create new field
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMode('library')}
                disabled={libraryMatches.length === 0}
              >
                <Library className="h-3.5 w-3.5 mr-1.5" />
                Select existing
                {libraryMatches.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {libraryMatches.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="p-3 space-y-3">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setMode('choose')}
            >
              ← Back
            </button>
            <div className="space-y-1.5">
              <Label htmlFor={`new-field-${type}`}>Field label</Label>
              <Input
                id={`new-field-${type}`}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={FIELD_TYPE_LABELS[type]}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              onClick={handleCreate}
            >
              Add to form
            </Button>
          </div>
        )}

        {mode === 'library' && (
          <div className="p-3 space-y-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setMode('choose')}
            >
              ← Back
            </button>
            <p className="text-sm font-medium">Reusable {FIELD_TYPE_LABELS[type]} fields</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {libraryMatches.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => handleSelectReusable(field)}
                  className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{field.label}</span>
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {FIELD_TYPE_LABELS[field.type]}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
