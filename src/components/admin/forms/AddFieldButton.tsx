'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Loader2 } from 'lucide-react'
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
  const [newLabel, setNewLabel] = useState('')
  const [optionsText, setOptionsText] = useState('Option 1, Option 2')
  const [creating, setCreating] = useState(false)

  const needsOptions = type === 'SELECT' || type === 'RADIO'

  const reset = () => {
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="justify-start gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {FIELD_TYPE_LABELS[type]}
        </Button>
      </PopoverTrigger>

      {/* Direct create form — no choose/library step */}
      <PopoverContent className="w-72 p-3 space-y-3" align="start">
        <p className="text-sm font-medium">
          {FIELD_TYPE_LABELS[type]} field
        </p>

        {/* Field label */}
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

        {/* Options — only for SELECT / RADIO */}
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

        {/* Add to form */}
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
      </PopoverContent>
    </Popover>
  )
}
