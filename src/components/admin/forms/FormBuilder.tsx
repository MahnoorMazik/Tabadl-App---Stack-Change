'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Save, Loader2 } from 'lucide-react'
import {
  FormTemplateDetail,
  CanvasField,
  FIELD_TYPES,
  ReusableField,
  AreaOfInterestKey,
  AREA_OF_INTEREST_OPTIONS,
  createEmptyFormTemplate,
  mapApiTemplateDetail,
} from './types'
import { AddFieldButton } from './AddFieldButton'
import { SortableFieldRow } from './SortableFieldRow'
import { FormPreview } from './FormPreview'
import { formApi, FormApiError } from './api'
import { useRouter } from 'next/navigation'

interface FormBuilderProps {
  initialTemplate?: FormTemplateDetail
  mode?: 'create' | 'edit'
  onSaved?: (template: FormTemplateDetail) => void
  inline?: boolean
  hideAreaOfInterest?: boolean
  forcedAreaOfInterest?: AreaOfInterestKey | null
}

export function FormBuilder({
  initialTemplate,
  mode = 'create',
  onSaved,
  inline = false,
  hideAreaOfInterest = false,
  forcedAreaOfInterest = null,
}: FormBuilderProps) {
  const { toast } = useToast()
  const [template, setTemplate] = useState<FormTemplateDetail>(
    () => initialTemplate ?? createEmptyFormTemplate()
  )
  const [showValidation, setShowValidation] = useState(false)
  const [libraryFields, setLibraryFields] = useState<ReusableField[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [saving, setSaving] = useState(false)
  const [baseline, setBaseline] = useState<string>(() =>
    JSON.stringify(initialTemplate ?? createEmptyFormTemplate())
  )
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate)
      setBaseline(JSON.stringify(initialTemplate))
    }
  }, [initialTemplate])

  useEffect(() => {
    let cancelled = false

    const loadMeta = async () => {
      setLoadingMeta(true)
      try {
        const fieldsRes = await formApi.listFields()
        if (cancelled) return

        setLibraryFields(
          (fieldsRes.fields ?? []).map((f: any) => ({
            id: f.id,
            label: f.label,
            type: f.type,
            options: f.options,
            helpText: f.helpText,
            placeholder: f.placeholder,
            isActive: f.isActive,
          }))
        )
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof FormApiError ? error.message : 'Failed to load form builder data'
        toast({ title: 'Load failed', description: message, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    }

    void loadMeta()
    return () => {
      cancelled = true
    }
  }, [toast])

  const isDirty = JSON.stringify(template) !== baseline
  const nameError = showValidation && !template.name.trim()
  const effectiveArea = forcedAreaOfInterest ?? template.areaOfInterest
  const areaError = showValidation && !effectiveArea
  const fieldsError = showValidation && template.fields.length === 0

  const setName = (name: string) => {
    setTemplate((prev) => ({ ...prev, name }))
  }

  const setAreaOfInterest = (key: AreaOfInterestKey) => {
    setTemplate((prev) => ({
      ...prev,
      areaOfInterest: key,
    }))
  }

  const addField = useCallback((field: CanvasField) => {
    setTemplate((prev) => {
      if (prev.fields.some((f) => f.fieldId === field.fieldId)) {
        return prev
      }
      return { ...prev, fields: [...prev.fields, field] }
    })
  }, [])

  const updateField = useCallback((id: string, patch: Partial<CanvasField>) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }, [])

  const removeField = useCallback((id: string) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }))
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setTemplate((prev) => {
      const oldIndex = prev.fields.findIndex((f) => f.id === active.id)
      const newIndex = prev.fields.findIndex((f) => f.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return {
        ...prev,
        fields: arrayMove(prev.fields, oldIndex, newIndex),
      }
    })
  }

  const buildPayload = () => ({
    name: template.name.trim(),
    description: template.description,
    areaOfInterest: effectiveArea,
    isActive: template.isActive,
    fieldIds: template.fields.map((f, index) => ({
      fieldId: f.fieldId,
      sortOrder: index,
      isRequired: f.type === 'INSTRUCTION' ? false : f.required,
      labelOverride: f.labelOverride?.trim() || null,
    })),
    serviceIds: [],
  })

  const handleSave = async () => {
    setShowValidation(true)
    if (!template.name.trim() || !effectiveArea || template.fields.length === 0) {
      toast({
        title: 'Cannot save form',
        description: 'Fix the validation errors before saving.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // Persist field tooltips on the reusable FormField records
      await Promise.all(
        template.fields.map((field) =>
          formApi.updateField(field.fieldId, {
            helpText: field.helpText?.trim() ? field.helpText.trim() : null,
          })
        )
      )

      const payload = buildPayload()
      const result =
        mode === 'edit' && template.id
          ? await formApi.updateTemplate(template.id, payload)
          : await formApi.createTemplate(payload)

      const savedName =
        result?.template?.name?.trim() || template.name.trim() || 'Form'
      const savedFieldCount = Array.isArray(result?.template?.fields)
        ? result.template.fields.length
        : template.fields.length
      const savedTemplate =
        result?.template ? mapApiTemplateDetail(result.template) : template

      toast({
        title: mode === 'edit' ? 'Form updated' : 'Form created',
        description: `"${savedName}" saved with ${savedFieldCount} field${savedFieldCount === 1 ? '' : 's'}.`,
      })

      onSaved?.(savedTemplate)
      if (!onSaved) {
        // Soft navigate — avoid full reload / permission race bouncing to dashboard
        router.replace('/admin/services/forms')
      }
    } catch (error) {
      const message =
        error instanceof FormApiError ? error.message : 'Failed to save form template'
      toast({ title: 'Save failed', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loadingMeta) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start h-full">
      {/* ── Left panel ── */}
      <Card
        className="flex flex-col overflow-hidden py-0 gap-0"
        style={{ height: inline ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)' }}
      >
        {/* Form settings — static, no scroll */}
        <div className="shrink-0 p-4 space-y-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Form settings</h2>

          <div className="space-y-1.5">
            <Label htmlFor="form-name">
              Form name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="form-name"
              value={template.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Company Formation Intake"
              aria-invalid={nameError}
              className={nameError ? 'border-destructive' : undefined}
            />
            {nameError && (
              <p className="text-xs text-destructive">Form name is required.</p>
            )}
          </div>

          {!hideAreaOfInterest && (
            <div className="space-y-2">
              <Label>
                Area of interest <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {AREA_OF_INTEREST_OPTIONS.map((option) => {
                  const checked = template.areaOfInterest === option.key
                  return (
                    <div
                      key={option.key}
                      className="flex items-start gap-2 rounded-md border px-2.5 py-2"
                    >
                      <Checkbox
                        id={`aoi-${option.key}`}
                        checked={checked}
                        onCheckedChange={() => setAreaOfInterest(option.key)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor={`aoi-${option.key}`}
                          className="font-normal cursor-pointer leading-snug"
                        >
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {option.key}
                      </Badge>
                    </div>
                  )
                })}
              </div>
              {areaError && (
                <p className="text-xs text-destructive">Area of interest is required.</p>
              )}
            </div>
          )}
        </div>

        {/* Add field — static, no scroll */}
        <div className="shrink-0 p-4 space-y-3 border-b">
          <h2 className="text-lg font-semibold mb-3">Add field</h2>
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map((type) => (
              <AddFieldButton
                key={type}
                type={type}
                libraryFields={libraryFields}
                existingFieldIds={template.fields.map((f) => f.fieldId)}
                onLibraryFieldCreated={(field) =>
                  setLibraryFields((prev) =>
                    prev.some((f) => f.id === field.id) ? prev : [field, ...prev]
                  )
                }
                onAdd={addField}
              />
            ))}
          </div>
        </div>

        {/* Form canvas — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
          <h2 className="text-lg font-semibold mb-3">Form canvas</h2>
          {fieldsError && (
            <p className="text-xs text-destructive">
              At least one field is required before saving.
            </p>
          )}
          {template.fields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Your form fields will appear here.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={template.fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {template.fields.map((field) => (
                    <SortableFieldRow
                      key={field.id}
                      field={field}
                      onUpdate={updateField}
                      onRemove={removeField}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Save button — pinned at bottom */}
        <div className="shrink-0 border-t bg-card px-6 py-4">
          <Button
            type="button"
            className="w-full bg-emerald-700 hover:bg-emerald-800 h-11 text-base font-semibold"
            onClick={() => void handleSave()}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Form
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* ── Right panel — sticky preview ── */}
      <div
        className="lg:sticky lg:top-0"
        style={{ height: inline ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)' }}
      >
        <Card className="h-full flex flex-col overflow-hidden p-4 gap-0">
          <CardHeader className="shrink-0 px-0 pb-3">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <CardTitle className="text-xl shrink-0">Form Preview -</CardTitle>
              <span className="text-xl font-medium text-slate-500 truncate">
                <span className="font-normal">{template.name.trim() || 'Untitled Form'}</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0 px-0">
            <FormPreview formName={template.name} fields={template.fields} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
