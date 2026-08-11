'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
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
import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'
import { parseBilingualText, encodeBilingualText, getLocalizedText } from '@/lib/multilingual-text'

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
  const { locale } = useLocale()
  const isRTL = locale === 'ar'
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

  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate)
      setBaseline(JSON.stringify(initialTemplate))
      const parsedName = parseBilingualText(initialTemplate.name)
      setNameEn(parsedName.en)
      setNameAr(parsedName.ar)
    }
  }, [initialTemplate])

  useEffect(() => {
    const encoded = (nameEn || nameAr) ? encodeBilingualText(nameEn, nameAr) : ''
    setTemplate((prev) => (prev.name === encoded ? prev : { ...prev, name: encoded }))
  }, [nameEn, nameAr])

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
      } catch {
        if (!cancelled) {
          toast({
            title: 'Failed to load field types',
            description: 'Field creation options may be limited.',
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    }

    void loadMeta()
    return () => {
      cancelled = true
    }
  }, [toast])

  const isDirty = useMemo(() => JSON.stringify(template) !== baseline, [template, baseline])
  const effectiveArea = forcedAreaOfInterest ?? template.areaOfInterest

  const setName = useCallback((name: string) => {
    setTemplate((prev) => ({ ...prev, name }))
  }, [])

  const setAreaOfInterest = useCallback((area: AreaOfInterestKey) => {
    setTemplate((prev) => ({ ...prev, areaOfInterest: area }))
  }, [])

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
    if (!nameEn.trim() || !nameAr.trim() || !effectiveArea || template.fields.length === 0) {
      toast({
        title: isRTL ? 'تعذر حفظ النموذج' : 'Cannot save form',
        description: isRTL ? 'يرجى إدخال اسم النموذج باللغتين الإنجليزية والعربية واستكمال باقي البيانات.' : 'Both English and Arabic form names are required.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
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

      const displaySavedName = getLocalizedText(savedName, locale)

      toast({
        title: mode === 'edit' ? 'Form updated' : 'Form created',
        description: `"${displaySavedName}" saved with ${savedFieldCount} field${savedFieldCount === 1 ? '' : 's'}.`,
      })

      onSaved?.(savedTemplate)
      if (!onSaved) {
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

  const nameError = showValidation && !template.name.trim()
  const areaError = showValidation && !effectiveArea
  const fieldsError = showValidation && template.fields.length === 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start h-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card
        className="flex flex-col overflow-hidden py-0 gap-0"
        style={{ height: inline ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)' }}
      >
        <div className={cn("shrink-0 p-4 space-y-4 border-b", isRTL ? "text-right" : "text-left")}>
          <h2 className="text-lg font-semibold mb-3">{isRTL ? 'إعدادات النموذج' : 'Form settings'}</h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="form-name-en" className={cn("block", isRTL ? "text-right" : "text-left")}>
                Form Name (English) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="form-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Company Formation Intake"
                aria-invalid={showValidation && !nameEn.trim()}
                className={cn(showValidation && !nameEn.trim() ? 'border-destructive' : undefined, "text-left")}
              />
              {showValidation && !nameEn.trim() && (
                <p className={cn("text-xs text-destructive", isRTL ? "text-right" : "text-left")}>
                  English form name is required.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-name-ar" className={cn("block", isRTL ? "text-right" : "text-left")}>
                اسم النموذج (بالعربية) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="form-name-ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: نموذج تعبئة بيانات تأسيس الشركة"
                aria-invalid={showValidation && !nameAr.trim()}
                dir="rtl"
                className={cn(showValidation && !nameAr.trim() ? 'border-destructive' : undefined, "text-right")}
              />
              {showValidation && !nameAr.trim() && (
                <p className={cn("text-xs text-destructive", isRTL ? "text-right" : "text-left")}>
                  اسم النموذج بالعربية مطلوب.
                </p>
              )}
            </div>
          </div>

          {!hideAreaOfInterest && (
            <div className="space-y-2">
              <Label className={cn("block", isRTL ? "text-right" : "text-left")}>
                {isRTL ? 'مجال الاهتمام' : 'Area of interest'} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {AREA_OF_INTEREST_OPTIONS.map((option) => {
                  const checked = template.areaOfInterest === option.key
                  return (
                    <div
                      key={option.key}
                      className={cn("flex items-start gap-2 rounded-md border px-2.5 py-2", isRTL ? "flex-row-reverse" : "flex-row")}
                    >
                      <Checkbox
                        id={`aoi-${option.key}`}
                        checked={checked}
                        onCheckedChange={() => setAreaOfInterest(option.key)}
                        className="mt-0.5"
                      />
                      <div className={cn("min-w-0 flex-1", isRTL ? "text-right" : "text-left")}>
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
                <p className={cn("text-xs text-destructive", isRTL ? "text-right" : "text-left")}>
                  {isRTL ? 'مجال الاهتمام مطلوب.' : 'Area of interest is required.'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={cn("shrink-0 p-4 space-y-3 border-b", isRTL ? "text-right" : "text-left")}>
          <h2 className="text-lg font-semibold mb-3">{isRTL ? 'إضافة حقل' : 'Add field'}</h2>
          <div className={cn("flex flex-wrap gap-2", isRTL ? "flex-row-reverse" : "flex-row")}>
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

        <div className={cn("flex-1 overflow-y-auto min-h-0 p-4 space-y-3", isRTL ? "text-right" : "text-left")}>
          <h2 className="text-lg font-semibold mb-3">{isRTL ? 'مخطط النموذج' : 'Form canvas'}</h2>
          {fieldsError && (
            <p className={cn("text-xs text-destructive", isRTL ? "text-right" : "text-left")}>
              {isRTL ? 'يلزم إدخال حقل واحد على الأقل قبل الحفظ.' : 'At least one field is required before saving.'}
            </p>
          )}
          {template.fields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              {isRTL ? 'ستظهر حقول النموذج هنا.' : 'Your form fields will appear here.'}
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

        <div className="shrink-0 border-t bg-card px-6 py-4">
          <Button
            type="button"
            className="w-full bg-emerald-700 hover:bg-emerald-800 h-11 text-base font-semibold cursor-pointer"
            onClick={() => void handleSave()}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <>
                <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                {isRTL ? 'جارٍ الحفظ…' : 'Saving…'}
              </>
            ) : (
              <>
                <Save className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {isRTL ? 'حفظ النموذج' : 'Save Form'}
              </>
            )}
          </Button>
        </div>
      </Card>

      <div
        className="lg:sticky lg:top-0"
        style={{ height: inline ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)' }}
      >
        <Card className="h-full flex flex-col overflow-hidden p-4 gap-0">
          <CardHeader className={cn("shrink-0 px-0 pb-3", isRTL ? "text-right" : "text-left")}>
            <div className={cn("flex items-center gap-2 min-w-0 flex-wrap", isRTL ? "flex-row-reverse" : "flex-row")}>
              <CardTitle className="text-xl shrink-0">{isRTL ? 'معاينة النموذج -' : 'Form Preview -'}</CardTitle>
              <span className="text-xl font-medium text-slate-500 truncate">
                <span className="font-normal">
                  {getLocalizedText(template.name, locale) || (isRTL ? 'نموذج بدون عنوان' : 'Untitled Form')}
                </span>
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
