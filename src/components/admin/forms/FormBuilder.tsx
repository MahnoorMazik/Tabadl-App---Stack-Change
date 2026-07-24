'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Save, AlertTriangle, Loader2 } from 'lucide-react'
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

interface FormBuilderProps {
  initialTemplate?: FormTemplateDetail
  mode?: 'create' | 'edit'
}

export function FormBuilder({ initialTemplate, mode = 'create' }: FormBuilderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [template, setTemplate] = useState<FormTemplateDetail>(
    () => initialTemplate ?? createEmptyFormTemplate()
  )
  const [showValidation, setShowValidation] = useState(false)
  const [services, setServices] = useState<BusinessServiceOption[]>([])
  const [libraryFields, setLibraryFields] = useState<ReusableField[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate)
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

  const nameError = showValidation && !template.name.trim()
  const fieldsError = showValidation && template.fields.length === 0
  const servicesWarning = template.serviceIds.length === 0

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
      setTemplate(saved)

      toast({
        title: mode === 'edit' ? 'Form updated' : 'Form created',
        description: `"${saved.name}" saved with ${saved.fields.length} field${saved.fields.length === 1 ? '' : 's'}.`,
      })

      if (mode === 'create') {
        router.replace(`/admin/services/forms/${saved.id}`)
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Form settings</CardTitle>
            <CardDescription>Name and service assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {servicesWarning && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-xs leading-relaxed">
                    This form isn&apos;t linked to any service yet — clients won&apos;t see it until you assign it.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button
              type="button"
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800"
              onClick={() => void handleSave()}
              disabled={saving}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add field</CardTitle>
            <CardDescription>Choose a type, then create or reuse a field</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Form canvas</CardTitle>
            <CardDescription>
              {template.fields.length === 0
                ? 'No fields yet — add one above'
                : `${template.fields.length} field${template.fields.length === 1 ? '' : 's'} · drag to reorder`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {fieldsError && (
              <p className="text-xs text-destructive mb-2">
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
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live preview</CardTitle>
            <CardDescription>How clients will see this form</CardDescription>
          </CardHeader>
          <CardContent>
            <FormPreview formName={template.name} fields={template.fields} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
