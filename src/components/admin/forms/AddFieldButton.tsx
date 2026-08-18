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
  FIELD_TYPE_LABELS_AR,
  getFieldTypeLabel,
  ReusableField,
  CanvasField,
  canvasFieldFromReusable,
  isDisplayOnlyFieldType,
} from './types'
import { formApi, FormApiError } from './api'
import { useToast } from '@/hooks/use-toast'
import { encodeBilingualText } from '@/lib/multilingual-text'
import { useLocale } from '@/contexts/LocaleContext'

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
  const [labelEn, setLabelEn] = useState('')
  const [labelAr, setLabelAr] = useState('')
  const [helpEn, setHelpEn] = useState('')
  const [helpAr, setHelpAr] = useState('')
  const [optionsText, setOptionsText] = useState('Option 1, Option 2')
  const [creating, setCreating] = useState(false)

  const needsOptions = type === 'SELECT' || type === 'RADIO'
  const isInstruction = isDisplayOnlyFieldType(type)

  const reset = () => {
    setLabelEn('')
    setLabelAr('')
    setHelpEn('')
    setHelpAr('')
    setOptionsText('Option 1, Option 2')
    setCreating(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const handleCreate = async () => {
    if (!labelEn.trim()) {
      toast({
        title: 'Field label required',
        description: 'Please enter a field label.',
        variant: 'destructive',
      })
      return
    }

    if (isInstruction && !helpEn.trim()) {
      toast({
        title: 'Instruction text required',
        description: 'Add the guidance text for applicants.',
        variant: 'destructive',
      })
      return
    }

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

    const encodedLabel = encodeBilingualText(labelEn.trim(), '')
    const encodedHelpText = helpEn.trim()
      ? encodeBilingualText(helpEn.trim(), '')
      : null

    setCreating(true)
    try {
      const { field } = await formApi.createField({
        label: encodedLabel,
        type,
        options: options ?? null,
        helpText: encodedHelpText,
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

  const { locale } = useLocale()
  const isRTL = locale === 'ar'

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="justify-start gap-1.5 cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          {getFieldTypeLabel(type, isRTL)}
        </Button>
      </PopoverTrigger>

      <PopoverContent dir={isRTL ? 'rtl' : 'ltr'} className="w-80 p-3 space-y-3" align="start">
        <div>
          <p className="text-sm font-medium">{getFieldTypeLabel(type, isRTL)}</p>
          {isInstruction && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'يعرض إرشادات في النموذج — لا يتطلب إدخال من المتقدم.' : 'Shows guidance on the form — no input from the applicant.'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`new-field-en-${type}`} className="text-xs font-medium">
              {isInstruction ? 'Heading' : 'Field label'} <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`new-field-en-${type}`}
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              placeholder={isInstruction ? 'e.g. Important notes' : FIELD_TYPE_LABELS[type]}
              autoFocus
              disabled={creating}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {isInstruction ? (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor={`new-field-instruction-en-${type}`} className="text-xs font-medium">
                Instruction text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id={`new-field-instruction-en-${type}`}
                value={helpEn}
                onChange={(e) => setHelpEn(e.target.value)}
                placeholder="Write the instructions applicants should read…"
                rows={3}
                disabled={creating}
                className="text-xs resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor={`new-field-tooltip-en-${type}`} className="text-xs font-normal text-muted-foreground">Tooltip / Help text</Label>
              <Input
                id={`new-field-tooltip-en-${type}`}
                value={helpEn}
                onChange={(e) => setHelpEn(e.target.value)}
                placeholder="Help text shown on ? hover"
                disabled={creating}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        {needsOptions && (
          <div className="space-y-1.5">
            <Label htmlFor={`new-field-options-${type}`} className="text-xs font-medium">Options (comma-separated)</Label>
            <Input
              id={`new-field-options-${type}`}
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              disabled={creating}
              className="h-8 text-xs"
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
