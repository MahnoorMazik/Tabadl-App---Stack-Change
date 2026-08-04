'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  isDisplayOnlyFieldType,
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
  const [newHelpText, setNewHelpText] = useState('')
  const [optionsText, setOptionsText] = useState('Option 1, Option 2')
  const [creating, setCreating] = useState(false)

  const needsOptions = type === 'SELECT' || type === 'RADIO'
  const isInstruction = isDisplayOnlyFieldType(type)

  const reset = () => {
    setNewLabel('')
    setNewHelpText('')
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

    if (isInstruction && !newHelpText.trim()) {
      toast({
        title: 'Instruction text required',
        description: 'Add the guidance text applicants should read.',
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
        helpText: newHelpText.trim() || null,
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
        onAdd(canvasFieldFromReusable(reusable, false))
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

      <PopoverContent className="w-80 p-3 space-y-3" align="start">
        <div>
          <p className="text-sm font-medium">{FIELD_TYPE_LABELS[type]}</p>
          {isInstruction && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Shows guidance on the form — no input from the applicant.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`new-field-${type}`}>
            {isInstruction ? 'Heading' : 'Field label'}
          </Label>
          <Input
            id={`new-field-${type}`}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={isInstruction ? 'e.g. Important notes' : FIELD_TYPE_LABELS[type]}
            autoFocus
            disabled={creating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isInstruction) {
                e.preventDefault()
                void handleCreate()
              }
            }}
          />
        </div>

        {isInstruction ? (
          <div className="space-y-1.5">
            <Label htmlFor={`new-field-instruction-${type}`}>
              Instruction text <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`new-field-instruction-${type}`}
              value={newHelpText}
              onChange={(e) => setNewHelpText(e.target.value)}
              placeholder="Write the instructions applicants should read…"
              rows={4}
              disabled={creating}
              className="resize-y"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor={`new-field-tooltip-${type}`}>Tooltip (optional)</Label>
            <Input
              id={`new-field-tooltip-${type}`}
              value={newHelpText}
              onChange={(e) => setNewHelpText(e.target.value)}
              placeholder="Help text shown on ? hover"
              disabled={creating}
            />
          </div>
        )}

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
      </PopoverContent>
    </Popover>
  )
}
