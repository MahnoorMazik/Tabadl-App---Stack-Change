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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import { formApi, FormApiError } from '@/components/admin/forms/api'
import { wizardApi, WizardApiError } from '@/components/admin/wizards/api'
import {
  AREA_OF_INTEREST_OPTIONS,
  AreaOfInterestKey,
  FormTemplateListItem,
  mapApiTemplateDetail,
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
      formName: step.formName,
      paymentRequired: step.paymentRequired,
      approvalRequired: step.approvalRequired,
      adminUseOnly: step.adminUseOnly ?? false,
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
  const [editingFormTemplate, setEditingFormTemplate] = useState<any>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
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
    setEditingFormTemplate(null)
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
      setModalStep(2)
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

  // Open the Template Builder to edit an existing form — open Sheet immediately, load async
  const handleEditForm = async (formTemplateId: string) => {
    // Open the sheet right away with a loading spinner inside FormBuilder
    setEditingFormTemplate(null)
    setLoadingTemplate(true)
    setBuilderOpen(true)
    try {
      const res = await formApi.getTemplate(formTemplateId)
      const mapped = mapApiTemplateDetail(res.template)
      setEditingFormTemplate(mapped)
    } catch (error) {
      setBuilderOpen(false)
      toast({
        title: 'Could not load form',
        description: 'Failed to load form template for editing.',
        variant: 'destructive',
      })
    } finally {
      setLoadingTemplate(false)
    }
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
    if (!draft.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Enter an application name before saving.',
        variant: 'destructive',
      })
      return
    }
    if (draft.steps.length === 0 || draft.steps.some((s) => !s.formTemplateId)) {
      toast({
        title: 'Incomplete steps',
        description: 'Add at least one step and select a form for each step.',
        variant: 'destructive',
      })
      return
    }
    if (!isEdit && (!draft.areaOfInterest || !draft.name.trim())) return

    setSaving(true)
    const stepsPayload = draft.steps.map((step, index) => ({
      formTemplateId: step.formTemplateId,
      paymentRequired: step.paymentRequired,
      approvalRequired: step.approvalRequired,
      adminUseOnly: step.adminUseOnly ?? false,
      sortOrder: index,
    }))

    // Edit: preserve areaOfInterest + serviceIds — do not send serviceIds (avoids clearing)
    const payload = isEdit
      ? {
          name: draft.name.trim(),
          steps: stepsPayload,
        }
      : {
          name: draft.name.trim(),
          areaOfInterest: draft.areaOfInterest,
          serviceIds: [] as string[],
          steps: stepsPayload,
        }

    try {
      if (isEdit && editingWizard) {
        const res = await wizardApi.update(editingWizard.id, payload)
        const wizard = mapApiWizard(res.wizard)
        onUpdated?.(wizard)
        toast({
          title: 'Application updated',
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

  const stepsList = (
    <div className="space-y-4">
      {stepsError && (
        <p className="text-xs text-destructive">
          Please create a form using the Template Builder first.
        </p>
      )}

      {draft.steps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No steps added yet. Create a form using the Template Builder — it will
            automatically appear as a step.
          </p>
          <Button
            type="button"
            className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
            onClick={() => setBuilderOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add step
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
              onClick={() => setBuilderOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add step
            </Button>
          </div>

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
                    onEditForm={handleEditForm}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  )

  const selectedService = AREA_OF_INTEREST_OPTIONS.find(
    (o) => o.key === draft.areaOfInterest
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] overflow-y-auto',
          isEdit
            ? [
                'sm:max-w-3xl border-border bg-background p-0 gap-0',
                // Modern open/close: soft fade + rise instead of default zoom snap
                'duration-300 ease-out',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
                'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2',
                'data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100',
              ].join(' ')
            : 'sm:max-w-xl border-emerald-100/80 bg-linear-to-b from-emerald-50/40 via-background to-background'
        )}
      >
        {isEdit ? (
          <>
            <DialogTitle className="sr-only">Edit Application</DialogTitle>
            <DialogDescription className="sr-only">
              Edit application name and steps.
            </DialogDescription>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="px-6 py-5">
                <Card className="flex flex-col overflow-hidden py-0 gap-0 border-border/80 shadow-sm">
                  <div className="flex-1 overflow-y-auto min-h-0 max-h-[min(520px,65vh)]">
                    <div className="p-4 space-y-4 border-b bg-muted/20">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">Edit Application</h2>
                        {selectedService && (
                          <p className="text-sm text-muted-foreground">
                            {selectedService.label}
                            <span className="text-muted-foreground/80"> ({selectedService.key})</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="wizard-name-edit">
                          Application name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="wizard-name-edit"
                          value={draft.name}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="e.g. Commercial registration application"
                          className="h-10 bg-background"
                          aria-invalid={showValidation && !draft.name.trim()}
                        />
                        {showValidation && !draft.name.trim() && (
                          <p className="text-xs text-destructive">
                            Application name is required.
                          </p>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <h2 className="text-lg font-semibold mb-1">Application steps</h2>
                      {stepsList}
                    </CardContent>
                  </div>

                  <div className="shrink-0 border-t bg-card px-4 py-4">
                    <Button
                      type="button"
                      className="w-full bg-emerald-700 hover:bg-emerald-800 h-11 text-base font-semibold cursor-pointer"
                      onClick={handleCreate}
                      disabled={saving || loading || draft.steps.length === 0}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader className="space-y-3 gap-0">
              <DialogTitle className="text-lg tracking-tight">
                Create Application Steps
              </DialogTitle>
              <DialogDescription className="text-sm">
                {modalStep === 1
                  ? 'Name your wizard and pick the service it belongs to.'
                  : 'Add and order form steps for this wizard.'}
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : modalStep === 1 ? (
              <div className="space-y-6 py-1">
                <div className="space-y-2">
                  <Label htmlFor="wizard-name" className="text-sm font-medium">
                    Wizard name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wizard-name"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Commercial registration application"
                    className="h-10 bg-background focus-visible:ring-emerald-600/30"
                  />
                  {setupError && !draft.name.trim() && (
                    <p className="text-xs text-destructive">Wizard name is required.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">
                      Service <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      One wizard per service — CR and PR each have their own live form.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {AREA_OF_INTEREST_OPTIONS.map((option) => {
                      const selected = draft.areaOfInterest === option.key
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setAreaOfInterest(option.key)}
                          className={cn(
                            'group relative flex justify-start flex-col rounded-xl border dark:bg-card p-4 text-left transition-all cursor-pointer',
                            'hover:border-emerald-500 hover:bg-primary/10 hover:shadow-md hover:shadow-emerald-500/10',
                            'focus-visible:outline-none',
                            selected &&
                              'border-emerald-500 hover:shadow-emerald-500/10 bg-emerald-500/10'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-base">{option.label}</span>
                            <Badge
                              variant="secondary"
                              className="text-[12px] bg-gray-100 border-gray-300 shrink-0"
                            >
                              {option.key}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {option.description}
                          </p>
                          <p className="mt-2 text-sm font-medium text-emerald-700 group-hover:text-emerald-800">
                            {selected ? 'Selected →' : 'Select service →'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                  {setupError && !draft.areaOfInterest && (
                    <p className="text-xs text-destructive">Please select CR or PR.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">{stepsList}</div>
            )}

            <DialogFooter
              className={`gap-2 ${modalStep === 2 ? 'sm:justify-between' : 'sm:justify-end'}`}
            >
              {modalStep === 2 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowValidation(false)
                      setModalStep(1)
                    }}
                    disabled={saving}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="bg-primary hover:bg-primary/90 cursor-pointer"
                    onClick={handleCreate}
                    disabled={saving || loading || draft.steps.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      'Create Wizard'
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary/90 cursor-pointer"
                  onClick={handleNext}
                  disabled={loading}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </DialogFooter>
          </>
        )}
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
      <Sheet open={builderOpen} onOpenChange={(open) => {
        setBuilderOpen(open)
        if (!open) setEditingFormTemplate(null)
      }}>
        <SheetContent side="right" className="w-[60vw] sm:max-w-none gap-0">
          <SheetHeader>
            <SheetTitle className='text-xl'>
              {editingFormTemplate ? 'Edit Form' : loadingTemplate ? 'Loading…' : 'Template Builder'}
            </SheetTitle>
            <SheetDescription>
              {editingFormTemplate
                ? 'Update this form — changes will be reflected in the step.'
                : loadingTemplate
                  ? 'Fetching form details…'
                  : 'Create a complete form, then it will be appended as a step.'}
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 overflow-hidden pt-2">
            {loadingTemplate && !editingFormTemplate ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : (
            <FormBuilder
              key={editingFormTemplate?.id ?? 'create'}
              mode={editingFormTemplate ? 'edit' : 'create'}
              initialTemplate={editingFormTemplate ?? undefined}
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
                setForms((prev) => {
                  const exists = prev.some((f) => f.id === newForm.id)
                  return exists
                    ? prev.map((f) => (f.id === newForm.id ? newForm : f))
                    : [newForm, ...prev]
                })
                if (editingFormTemplate) {
                  // Update the existing step's formName
                  setDraft((prev) => ({
                    ...prev,
                    steps: prev.steps.map((s) =>
                      s.formTemplateId === saved.id
                        ? { ...s, formName: saved.name } as any
                        : s
                    ),
                  }))
                } else {
                  addFormAsStep(newForm, 'new')
                }
                setBuilderOpen(false)
                setEditingFormTemplate(null)
              }}
            />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  )
}
