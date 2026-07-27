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
import { Loader2, Plus, ArrowLeft, ArrowRight } from 'lucide-react'
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

interface ServiceOption {
  id: string
  name: string
}

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
  const [services, setServices] = useState<ServiceOption[]>([])
  const [forms, setForms] = useState<FormTemplateListItem[]>([])

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
        const [servicesRes, formsRes] = await Promise.all([
          formApi.availableServices(),
          formApi.listTemplates(),
        ])
        if (cancelled) return

        setServices(
          (servicesRes.services ?? []).map((s: any) => ({
            id: s.id,
            name: s.name,
          }))
        )

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
    if (!draft.areaOfInterest) return forms.filter((f) => f.isActive)
    return forms.filter(
      (f) => f.isActive && (f.areaOfInterest === draft.areaOfInterest || !f.areaOfInterest)
    )
  }, [forms, draft.areaOfInterest])

  const setupError =
    showValidation &&
    modalStep === 1 &&
    (!draft.name.trim() || !draft.areaOfInterest || draft.serviceIds.length === 0)

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

  const toggleService = (serviceId: string) => {
    setDraft((prev) => {
      const selected = prev.serviceIds.includes(serviceId)
      return {
        ...prev,
        serviceIds: selected
          ? prev.serviceIds.filter((id) => id !== serviceId)
          : [...prev.serviceIds, serviceId],
      }
    })
  }

  const updateStep = (stepId: string, patch: Partial<WizardStepDraft>) => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
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
    if (!draft.name.trim() || !draft.areaOfInterest || draft.serviceIds.length === 0) {
      toast({
        title: 'Complete setup',
        description: 'Enter a wizard name, select an area of interest, and at least one service.',
        variant: 'destructive',
      })
      return
    }
    setShowValidation(false)
    setModalStep(2)
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
      serviceIds: [...draft.serviceIds],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Application Steps' : 'Create Application Steps'}
          </DialogTitle>
          <DialogDescription>
            {modalStep === 1
              ? 'Name the wizard, then choose area of interest and services.'
              : 'Add forms as wizard steps, drag to reorder, and set payment requirements.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : modalStep === 1 ? (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
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
              />
              {setupError && !draft.name.trim() && (
                <p className="text-xs text-destructive">Wizard name is required.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Area of interest <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {AREA_OF_INTEREST_OPTIONS.map((option) => {
                  const checked = draft.areaOfInterest === option.key
                  return (
                    <div
                      key={option.key}
                      className="flex items-start gap-2 rounded-md border px-2.5 py-2"
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

            <div className="space-y-2">
              <Label>
                Services <span className="text-destructive">*</span>
              </Label>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active business services found. Seed the catalog first.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {services.map((service) => {
                    const checked = draft.serviceIds.includes(service.id)
                    return (
                      <div
                        key={service.id}
                        className="flex items-start gap-2 rounded-md border px-2.5 py-2"
                      >
                        <Checkbox
                          id={`wizard-svc-${service.id}`}
                          checked={checked}
                          onCheckedChange={() => toggleService(service.id)}
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={`wizard-svc-${service.id}`}
                          className="font-normal cursor-pointer leading-snug"
                        >
                          {service.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              )}
              {setupError && draft.serviceIds.length === 0 && (
                <p className="text-xs text-destructive">Select at least one service.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{draft.areaOfInterest}</Badge>
              <span>
                {draft.serviceIds.length} service
                {draft.serviceIds.length === 1 ? '' : 's'} selected
              </span>
            </div>

            {stepsError && (
              <p className="text-xs text-destructive">
                Each step must have a form selected.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Drag steps by the grip handle to change their order.
            </p>

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

            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add step
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
                className="bg-emerald-700 hover:bg-emerald-800"
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
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={handleNext}
              disabled={loading}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
