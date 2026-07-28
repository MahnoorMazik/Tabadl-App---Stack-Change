'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Loader2, Plus, ArrowLeft, ArrowRight, Search, Wand2, Shapes } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formApi, FormApiError } from '@/components/admin/forms/api'
import { wizardApi, WizardApiError } from '@/components/admin/wizards/api'
import {
  AREA_OF_INTEREST_OPTIONS,
  AreaOfInterestKey,
  FormTemplateListItem,
} from '@/components/admin/forms/types'
import {
  WizardDraft,
  WizardListItem,
  WizardStepDraft,
  createEmptyWizardDraft,
  createEmptyWizardStep,
  mapApiWizard,
} from './types'
import { SortableWizardStep } from './SortableWizardStep'
import { FormBuilder } from '@/components/admin/forms/FormBuilder'

interface CreateWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (wizard: WizardListItem) => void
  onUpdated?: (wizard: WizardListItem) => void
  /** When set, modal opens in edit mode with this wizard prefilled. */
  editingWizard?: WizardListItem | null
}

function draftFromWizard(wizard: WizardListItem): WizardDraft {
  return {
    name: wizard.name,
    areaOfInterest: wizard.areaOfInterest,
    serviceIds: [...wizard.serviceIds],
    steps: wizard.steps.map((step) => ({
      id: step.id,
      formTemplateId: step.formTemplateId,
      paymentRequired: step.paymentRequired,
    })),
  }
}

export function CreateWizardModal({
  open,
  onOpenChange,
  onCreated,
  onUpdated,
  editingWizard = null,
}: CreateWizardModalProps) {
  const { toast } = useToast()
  const isEdit = Boolean(editingWizard)
  const [modalStep, setModalStep] = useState<1 | 2>(1)
  const [draft, setDraft] = useState<WizardDraft>(createEmptyWizardDraft)
  const [showValidation, setShowValidation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [forms, setForms] = useState<FormTemplateListItem[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'existing' | 'quick'>('existing')
  const [formSearch, setFormSearch] = useState('')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickFields, setQuickFields] = useState<
    Array<{ id: string; type: 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'SELECT'; label: string; options: string }>
  >([])
  const [quickSaving, setQuickSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const reset = useCallback(() => {
    setModalStep(1)
    setDraft(createEmptyWizardDraft())
    setShowValidation(false)
    setSaving(false)
    setPickerOpen(false)
    setBuilderOpen(false)
    setQuickName('')
    setQuickFields([])
    setFormSearch('')
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }

    if (editingWizard) {
      setDraft(draftFromWizard(editingWizard))
      setModalStep(1)
      setShowValidation(false)
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const formsRes = await formApi.listTemplates()
        if (cancelled) return

        setForms(
          (formsRes.templates ?? []).map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            areaOfInterest: t.areaOfInterest ?? null,
            isActive: t.isActive,
            fieldCount: t.fieldCount ?? 0,
            updatedAt: t.updatedAt,
            services: t.services ?? [],
          }))
        )
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof FormApiError ? error.message : 'Failed to load wizard data'
        toast({ title: 'Load failed', description: message, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, reset, toast, editingWizard])

  const formsForArea = useMemo(() => {
    const activeForms = forms.filter((f) => f.isActive !== false)
    if (!draft.areaOfInterest) return activeForms

    const area = draft.areaOfInterest
    const matched = activeForms.filter((f) => {
      const formArea = f.areaOfInterest
      if (!formArea) return true
      return String(formArea).toUpperCase() === String(area).toUpperCase()
    })

    // If nothing matches the selected area, still show all active forms so the
    // admin can pick one (e.g. older forms without area, or mismatch).
    return matched.length > 0 ? matched : activeForms
  }, [forms, draft.areaOfInterest])

  const setupError =
    showValidation &&
    modalStep === 1 &&
    (!draft.name.trim() || !draft.areaOfInterest)

  const stepsError =
    showValidation &&
    modalStep === 2 &&
    (draft.steps.length === 0 || draft.steps.some((s) => !s.formTemplateId))

  const setAreaOfInterest = (key: AreaOfInterestKey) => {
    setDraft((prev) => ({
      ...prev,
      areaOfInterest: key,
      // Clear form picks when area changes — lists are filtered by area
      steps: prev.steps.map((step) => ({ ...step, formTemplateId: '' })),
    }))
  }

  const updateStep = (stepId: string, patch: Partial<WizardStepDraft>) => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    }))
  }

  const addFormAsStep = (form: FormTemplateListItem, source: 'library' | 'new') => {
    setDraft((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          ...createEmptyWizardStep(),
          formTemplateId: form.id,
          source,
          fieldCount: form.fieldCount,
          formName: form.name,
        },
      ],
    }))
  }

  const addStep = () => {
    setDraft((prev) => ({
      ...prev,
      steps: [...prev.steps, createEmptyWizardStep()],
    }))
  }

  const removeStep = (stepId: string) => {
    setDraft((prev) => {
      if (prev.steps.length <= 1) return prev
      return {
        ...prev,
        steps: prev.steps.filter((s) => s.id !== stepId),
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setDraft((prev) => {
      const oldIndex = prev.steps.findIndex((s) => s.id === active.id)
      const newIndex = prev.steps.findIndex((s) => s.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return {
        ...prev,
        steps: arrayMove(prev.steps, oldIndex, newIndex),
      }
    })
  }

  const handleNext = () => {
    setShowValidation(true)
    if (!draft.name.trim() || !draft.areaOfInterest) {
      toast({
        title: 'Complete setup',
        description: 'Enter wizard name and select area of interest.',
        variant: 'destructive',
      })
      return
    }
    setShowValidation(false)
    // Refresh forms before step 2 so newly created GR/PR/CR templates appear
    void (async () => {
      try {
        const formsRes = await formApi.listTemplates()
        setForms(
          (formsRes.templates ?? []).map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            areaOfInterest: t.areaOfInterest ?? null,
            isActive: t.isActive !== false,
            fieldCount: t.fieldCount ?? 0,
            updatedAt: t.updatedAt,
            services: t.services ?? [],
          }))
        )
      } catch {
        // Keep previously loaded forms
      } finally {
        setModalStep(2)
      }
    })()
  }

  const handleCreate = async () => {
    setShowValidation(true)
    if (draft.steps.length === 0 || draft.steps.some((s) => !s.formTemplateId)) {
      toast({
        title: 'Incomplete steps',
        description: 'Add at least one step and select a form for each step.',
        variant: 'destructive',
      })
      return
    }
    if (!draft.areaOfInterest || !draft.name.trim()) return

    setSaving(true)
    const payload = {
      name: draft.name.trim(),
      areaOfInterest: draft.areaOfInterest,
      serviceIds: [],
      steps: draft.steps.map((step, index) => ({
        formTemplateId: step.formTemplateId,
        paymentRequired: step.paymentRequired,
        sortOrder: index,
      })),
    }

    try {
      if (isEdit && editingWizard) {
        const res = await wizardApi.update(editingWizard.id, payload)
        const wizard = mapApiWizard(res.wizard)
        onUpdated?.(wizard)
        toast({
          title: 'Wizard updated',
          description: `${wizard.name} saved with ${wizard.steps.length} step${wizard.steps.length === 1 ? '' : 's'}.`,
        })
      } else {
        const res = await wizardApi.create(payload)
        const wizard = mapApiWizard(res.wizard)
        onCreated(wizard)
        toast({
          title: 'Wizard created',
          description: `${wizard.name} configured with ${wizard.steps.length} step${wizard.steps.length === 1 ? '' : 's'}.`,
        })
      }
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof WizardApiError
          ? error.message
          : 'Failed to save wizard. Please try again.'
      toast({
        title: isEdit ? 'Update failed' : 'Create failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const usedFormIds = draft.steps.map((s) => s.formTemplateId).filter(Boolean)
  const searchedForms = formsForArea.filter((f) =>
    f.name.toLowerCase().includes(formSearch.toLowerCase())
  )

  const appendQuickField = (type: 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'SELECT') => {
    setQuickFields((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        label: '',
        options: '',
      },
    ])
  }

  const createQuickForm = async () => {
    if (!quickName.trim() || quickFields.length === 0) {
      toast({
        title: 'Quick create incomplete',
        description: 'Provide form name and at least one field.',
        variant: 'destructive',
      })
      return
    }
    if (!draft.areaOfInterest) return

    setQuickSaving(true)
    try {
      const createdFields: any[] = []
      for (const field of quickFields) {
        if (!field.label.trim()) continue
        const options =
          field.type === 'SELECT'
            ? field.options
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            : undefined
        const res = await formApi.createField({
          label: field.label.trim(),
          type: field.type,
          options,
          isActive: true,
        })
        createdFields.push(res.field)
      }
      if (createdFields.length === 0) {
        throw new Error('At least one valid field is required')
      }
      const formRes = await formApi.createTemplate({
        name: quickName.trim(),
        description: null,
        areaOfInterest: draft.areaOfInterest,
        isActive: true,
        serviceIds: [],
        fieldIds: createdFields.map((field: any, index: number) => ({
          fieldId: field.id,
          sortOrder: index,
          isRequired: false,
          labelOverride: null,
        })),
      })

      const newForm: FormTemplateListItem = {
        id: formRes.template.id,
        name: formRes.template.name,
        description: formRes.template.description,
        areaOfInterest: formRes.template.areaOfInterest ?? null,
        isActive: formRes.template.isActive,
        fieldCount: formRes.template.fieldCount ?? createdFields.length,
        updatedAt: formRes.template.updatedAt ?? new Date().toISOString(),
        services: formRes.template.services ?? [],
      }
      setForms((prev) => [newForm, ...prev])
      addFormAsStep(newForm, 'new')
      setQuickFields([])
      setQuickName('')
      setPickerOpen(false)
      toast({ title: 'Form created', description: `${newForm.name} added as step.` })
    } catch (error) {
      const message = error instanceof FormApiError ? error.message : 'Quick create failed'
      toast({ title: 'Quick create failed', description: message, variant: 'destructive' })
    } finally {
      setQuickSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-border bg-linear-to-b from-muted/40 via-background to-background">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Application Steps' : 'Create Application Steps'}
          </DialogTitle>
          <DialogDescription>
            {modalStep === 1
              ? 'Basics'
              : 'Steps'}
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
            <div className={`h-2.5 w-2.5 rounded-full ${modalStep === 1 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
            <span className={`text-xs ${modalStep === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Basics</span>
            <div className="h-px flex-1 bg-border" />
            <div className={`h-2.5 w-2.5 rounded-full ${modalStep === 2 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
            <span className={`text-xs ${modalStep === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Steps</span>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : modalStep === 1 ? (
          <div className="space-y-5 py-2">
            <div className="space-y-2 rounded-lg border border-border p-3.5 bg-muted/30 shadow-sm">
              <Label htmlFor="wizard-name">
                Wizard name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Commercial registration application"
                className="bg-background/95 border-border focus-visible:ring-primary"
              />
              {setupError && !draft.name.trim() && (
                <p className="text-xs text-destructive">Wizard name is required.</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3.5 bg-muted/30 shadow-sm">
              <Label>
                Area of interest <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {AREA_OF_INTEREST_OPTIONS.map((option) => {
                  const checked = draft.areaOfInterest === option.key
                  return (
                    <div
                      key={option.key}
                      className={`flex items-start gap-2 rounded-md border px-2.5 py-2 transition-colors ${
                        checked
                          ? 'border-primary/30 bg-primary/10'
                          : 'border-border bg-background/70 hover:bg-muted/60'
                      }`}
                    >
                      <Checkbox
                        id={`wizard-aoi-${option.key}`}
                        checked={checked}
                        onCheckedChange={() => setAreaOfInterest(option.key)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor={`wizard-aoi-${option.key}`}
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
              {setupError && !draft.areaOfInterest && (
                <p className="text-xs text-destructive">Area of interest is required.</p>
              )}
            </div>

          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground rounded-md border border-border bg-muted/40 p-2.5">
              <div className="flex items-center gap-2">
              <Badge variant="secondary">{draft.areaOfInterest}</Badge>
                <span>{draft.steps.length} step{draft.steps.length === 1 ? '' : 's'}</span>
              </div>
              <span className="text-xs">Reorder with drag handle</span>
            </div>

            {stepsError && (
              <p className="text-xs text-destructive">
                Each step must have a form selected.
              </p>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={draft.steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {draft.steps.map((step, index) => (
                    <SortableWizardStep
                      key={step.id}
                      step={step}
                      index={index}
                      canRemove={draft.steps.length > 1}
                      formsForArea={formsForArea}
                      usedFormIds={usedFormIds}
                      onUpdate={updateStep}
                      onRemove={removeStep}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-4 font-medium"
                onClick={() => setPickerOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add step
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-4 font-medium"
                onClick={() => setBuilderOpen(true)}
              >
                Open full form builder
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add empty step
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {modalStep === 2 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowValidation(false)
                  setModalStep(1)
                }}
                disabled={saving}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90"
                onClick={handleCreate}
                disabled={saving || loading}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEdit ? 'Saving…' : 'Creating…'}
                  </>
                ) : isEdit ? (
                  'Save changes'
                ) : (
                  'Create wizard'
                )}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90"
              onClick={handleNext}
              disabled={loading}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl border-border bg-linear-to-b from-muted/40 via-background to-background">
          <DialogHeader>
            <DialogTitle>Add step</DialogTitle>
            <DialogDescription>Choose from library or create instantly.</DialogDescription>
          </DialogHeader>
          <Tabs value={pickerTab} onValueChange={(v) => setPickerTab(v as 'existing' | 'quick')} className="space-y-3">
            <TabsList className="bg-muted/70">
              <TabsTrigger value="existing" className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Choose existing form
              </TabsTrigger>
              <TabsTrigger value="quick" className="gap-1.5">
                <Wand2 className="h-3.5 w-3.5" />
                Quick create
              </TabsTrigger>
            </TabsList>
            <TabsContent value="existing" className="space-y-3">
              <Input
                placeholder="Search forms..."
                value={formSearch}
                onChange={(e) => setFormSearch(e.target.value)}
                className="bg-background/95 border-border focus-visible:ring-primary"
              />
              <div className="max-h-72 overflow-auto space-y-2 rounded-md border border-border bg-muted/30 p-2">
                {searchedForms.map((form) => (
                  <button
                    key={form.id}
                    type="button"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-left transition hover:bg-muted/70 hover:border-primary/30"
                    onClick={() => {
                      addFormAsStep(form, 'library')
                      setPickerOpen(false)
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{form.name}</span>
                      <Badge variant="secondary">{form.areaOfInterest ?? 'N/A'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{form.fieldCount} fields</p>
                  </button>
                ))}
                {searchedForms.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No forms found for your search.</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="quick" className="space-y-3">
              <Input
                placeholder="Quick form name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="bg-background/95 border-border focus-visible:ring-primary"
              />
              <div className="rounded-md border border-border bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground mb-2">Field palette</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-border hover:bg-muted" onClick={() => appendQuickField('TEXT')}>Text</Button>
                  <Button size="sm" variant="outline" className="border-border hover:bg-muted" onClick={() => appendQuickField('TEXTAREA')}>Long text</Button>
                  <Button size="sm" variant="outline" className="border-border hover:bg-muted" onClick={() => appendQuickField('EMAIL')}>Email</Button>
                  <Button size="sm" variant="outline" className="border-border hover:bg-muted" onClick={() => appendQuickField('PHONE')}>Phone</Button>
                  <Button size="sm" variant="outline" className="border-border hover:bg-muted" onClick={() => appendQuickField('SELECT')}>Dropdown</Button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-2">
                {quickFields.map((field, idx) => (
                  <div key={field.id} className="rounded-md border border-border bg-card p-2 space-y-2">
                    <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Shapes className="h-3 w-3" />
                      {field.type}
                    </div>
                    <Input
                      placeholder={`Field ${idx + 1} label`}
                      value={field.label}
                      onChange={(e) =>
                        setQuickFields((prev) =>
                          prev.map((f) => (f.id === field.id ? { ...f, label: e.target.value } : f))
                        )
                      }
                    />
                    {field.type === 'SELECT' && (
                      <Input
                        placeholder="Options comma-separated"
                        value={field.options}
                        onChange={(e) =>
                          setQuickFields((prev) =>
                            prev.map((f) => (f.id === field.id ? { ...f, options: e.target.value } : f))
                          )
                        }
                        className="bg-background/95 border-border focus-visible:ring-primary"
                      />
                    )}
                  </div>
                ))}
                {quickFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add field chips to build this quick form.</p>
                )}
              </div>
              <div className="flex justify-end">
                <Button className="bg-primary hover:bg-primary/90" onClick={createQuickForm} disabled={quickSaving}>
                  {quickSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create and add step
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Sheet open={builderOpen} onOpenChange={setBuilderOpen}>
        <SheetContent side="right" className="w-[95vw] sm:max-w-none">
          <SheetHeader>
            <SheetTitle>Full form builder</SheetTitle>
            <SheetDescription>Create a complete form, then it will be appended as a step.</SheetDescription>
          </SheetHeader>
          <div className="p-4 overflow-auto">
            <FormBuilder
              mode="create"
              inline
              hideAreaOfInterest
              forcedAreaOfInterest={draft.areaOfInterest}
              onSaved={(saved) => {
                const newForm: FormTemplateListItem = {
                  id: saved.id,
                  name: saved.name,
                  description: saved.description,
                  areaOfInterest: saved.areaOfInterest,
                  isActive: saved.isActive,
                  fieldCount: saved.fields.length,
                  updatedAt: saved.updatedAt,
                  services: [],
                }
                setForms((prev) => [newForm, ...prev])
                addFormAsStep(newForm, 'new')
                setBuilderOpen(false)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  )
}
