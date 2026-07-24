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
import { Plus, Library, Loader2 } from 'lucide-react'
import {
  FormFieldType,
  FIELD_TYPE_LABELS,
  ReusableField,
  CanvasField,
  canvasFieldFromReusable,
} from './types'
import { formApi, FormApiError } from './api'
import { useToast } from '@/hooks/use-toast'

interface AddFieldButtonProps {
  type: FormFieldType
  libraryFields: ReusableField[]
  existingFieldIds: string[]
  onLibraryFieldCreated: (field: ReusableField) => void
  onAdd: (field: CanvasField) => void
}

export function AddFieldButton({
  type,
  libraryFields,
  existingFieldIds,
  onLibraryFieldCreated,
  onAdd,
}: AddFieldButtonProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'choose' | 'create' | 'library'>('choose')
  const [newLabel, setNewLabel] = useState('')
  const [optionsText, setOptionsText] = useState('Option 1, Option 2')
  const [creating, setCreating] = useState(false)

  const needsOptions = type === 'SELECT' || type === 'RADIO'

  const libraryMatches = useMemo(
    () => libraryFields.filter((f) => f.type === type && f.isActive !== false),
    [libraryFields, type]
  )

  const reset = () => {
    setMode('choose')
    setNewLabel('')
    setOptionsText('Option 1, Option 2')
    setCreating(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const handleCreate = async () => {
    const label = newLabel.trim() || FIELD_TYPE_LABELS[type]
    const options = needsOptions
      ? optionsText
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined

    if (needsOptions && (!options || options.length === 0)) {
      toast({
        title: 'Options required',
        description: 'Add at least one option for this field type.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const { field } = await formApi.createField({
        label,
        type,
        options: options ?? null,
      })

      const reusable: ReusableField = {
        id: field.id,
        label: field.label,
        type: field.type,
        options: field.options,
        helpText: field.helpText,
        placeholder: field.placeholder,
        isActive: field.isActive,
      }

      onLibraryFieldCreated(reusable)

      if (existingFieldIds.includes(reusable.id)) {
        toast({
          title: 'Field already on form',
          description: 'This field is already added to the canvas.',
        })
      } else {
        onAdd(canvasFieldFromReusable(reusable))
      }

      handleOpenChange(false)
    } catch (error) {
      const message =
        error instanceof FormApiError ? error.message : 'Failed to create field'
      toast({ title: 'Could not create field', description: message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleSelectReusable = (field: ReusableField) => {
    if (existingFieldIds.includes(field.id)) {
      toast({
        title: 'Field already on form',
        description: 'Each reusable field can only appear once on a template.',
        variant: 'destructive',
      })
      return
    }
    onAdd(canvasFieldFromReusable(field))
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
              Create a new reusable field or pick one from the library.
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
              disabled={creating}
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
                disabled={creating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleCreate()
                  }
                }}
              />
            </div>
            {needsOptions && (
              <div className="space-y-1.5">
                <Label htmlFor={`new-field-options-${type}`}>Options (comma-separated)</Label>
                <Input
                  id={`new-field-options-${type}`}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  disabled={creating}
                />
              </div>
            )}
            <Button
              type="button"
              size="sm"
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              onClick={() => void handleCreate()}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Creating…
                </>
              ) : (
                'Add to form'
              )}
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
              {libraryMatches.map((field) => {
                const alreadyOnForm = existingFieldIds.includes(field.id)
                return (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => handleSelectReusable(field)}
                    disabled={alreadyOnForm}
                    className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="font-medium">{field.label}</span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {FIELD_TYPE_LABELS[field.type]}
                    </Badge>
                    {alreadyOnForm && (
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        Already on this form
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
