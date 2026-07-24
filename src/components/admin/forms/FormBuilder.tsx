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
  BusinessServiceOption,
  ReusableField,
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
}

export function FormBuilder({ initialTemplate, mode = 'create' }: FormBuilderProps) {
  const { toast } = useToast()
  const [template, setTemplate] = useState<FormTemplateDetail>(
    () => initialTemplate ?? createEmptyFormTemplate()
  )
  const [showValidation, setShowValidation] = useState(false)
  const [services, setServices] = useState<BusinessServiceOption[]>([])
  const [libraryFields, setLibraryFields] = useState<ReusableField[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [saving, setSaving] = useState(false)
  // Baseline snapshot used to detect unsaved changes
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
        const excludeId = mode === 'edit' && template.id ? template.id : undefined
        const [servicesRes, fieldsRes] = await Promise.all([
          formApi.availableServices(excludeId),
          formApi.listFields(),
        ])
        if (cancelled) return

        setServices(
          (servicesRes.services ?? []).map((s: any) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            alreadyAssigned: s.alreadyAssigned,
            assignedTemplateId: s.assignedTemplateId,
            assignedTemplateName: s.assignedTemplateName,
            linkedLabel:
              s.alreadyAssigned && s.assignedTemplateName
                ? `On "${s.assignedTemplateName}"`
                : undefined,
          }))
        )

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
    // Only re-fetch services when edit template id is known
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialTemplate?.id])

  const isDirty = JSON.stringify(template) !== baseline
  const nameError = showValidation && !template.name.trim()
  const fieldsError = showValidation && template.fields.length === 0

  const setName = (name: string) => {
    setTemplate((prev) => ({ ...prev, name }))
  }

  const toggleService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    if (service?.alreadyAssigned && !template.serviceIds.includes(serviceId)) {
      toast({
        title: 'Service already assigned',
        description: service.assignedTemplateName
          ? `This service is linked to "${service.assignedTemplateName}".`
          : 'This service is already linked to another form.',
        variant: 'destructive',
      })
      return
    }

    setTemplate((prev) => {
      const selected = prev.serviceIds.includes(serviceId)
      return {
        ...prev,
        serviceIds: selected
          ? prev.serviceIds.filter((id) => id !== serviceId)
          : [...prev.serviceIds, serviceId],
      }
    })
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
    isActive: template.isActive,
    fieldIds: template.fields.map((f, index) => ({
      fieldId: f.fieldId,
      sortOrder: index,
      isRequired: f.required,
      labelOverride: f.labelOverride?.trim() || null,
    })),
    serviceIds: template.serviceIds,
  })

  const handleSave = async () => {
    setShowValidation(true)
    if (!template.name.trim() || template.fields.length === 0) {
      toast({
        title: 'Cannot save form',
        description: 'Fix the validation errors before saving.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = buildPayload()
      const result =
        mode === 'edit' && template.id
          ? await formApi.updateTemplate(template.id, payload)
          : await formApi.createTemplate(payload)

      const saved = mapApiTemplateDetail(result.template)

      toast({
        title: mode === 'edit' ? 'Form updated' : 'Form created',
        description: `"${saved.name}" saved with ${saved.fields.length} field${saved.fields.length === 1 ? '' : 's'}.`,
      })

      // Navigate back to the forms list
      // window.location.href = '/admin/services/forms'
      // router.replace('/admin/services/forms')
    } catch (error) {
      const message =
        error instanceof FormApiError ? error.message : 'Failed to save form template'
      toast({ title: 'Save failed', description: message, variant: 'destructive' })
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
      {/* ── Left column: single card with scrollable body + sticky save footer ── */}
      <Card className="flex flex-col overflow-hidden py-0" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Form settings */}
          <div className="p-6 space-y-4 border-b">
            <h2 className="text-xl font-semibold">Form settings</h2>

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

            <div className="space-y-2">
              <Label>Assign to Services</Label>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active business services found. Seed the catalog first.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {services.map((service) => {
                    const checked = template.serviceIds.includes(service.id)
                    const locked = Boolean(service.alreadyAssigned) && !checked
                    return (
                      <div
                        key={service.id}
                        className={`flex items-start gap-2 rounded-md border px-2.5 py-2 ${locked ? 'opacity-60' : ''}`}
                      >
                        <Checkbox
                          id={`svc-${service.id}`}
                          checked={checked}
                          disabled={locked}
                          onCheckedChange={() => toggleService(service.id)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <Label
                            htmlFor={`svc-${service.id}`}
                            className="font-normal cursor-pointer leading-snug"
                          >
                            {service.name}
                          </Label>
                          {service.linkedLabel && (
                            <Badge
                              variant="secondary"
                              className="mt-1 text-[10px] font-normal text-muted-foreground"
                            >
                              {service.linkedLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add field */}
          <div className="p-6 space-y-3 border-b">
            <h2 className="text-xl font-semibold">Add field</h2>
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

          {/* Form canvas */}
          <div className="p-6 space-y-3">
            <h2 className="text-xl font-semibold">Form canvas</h2>
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
        </div>

        {/* ── Fixed save footer — never scrolls ── */}
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

      {/* ── Right column: live preview ── */}
      <div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Form Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <FormPreview formName={template.name} fields={template.fields} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
