'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GripVertical, Trash2, Pencil } from 'lucide-react'
import { FormTemplateListItem } from '@/components/admin/forms/types'
import { WizardStepDraft } from './types'

import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

interface SortableWizardStepProps {
  step: WizardStepDraft
  index: number
  canRemove: boolean
  formsForArea: FormTemplateListItem[]
  usedFormIds: string[]
  onUpdate: (stepId: string, patch: Partial<WizardStepDraft>) => void
  onRemove: (stepId: string) => void
  onEditForm?: (formTemplateId: string) => void
}

export function SortableWizardStep({
  step,
  index,
  canRemove,
  formsForArea,
  usedFormIds: _usedFormIds,
  onUpdate,
  onRemove,
  onEditForm,
}: SortableWizardStepProps) {
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const selectedForm = formsForArea.find((f) => f.id === step.formTemplateId)
  const displayName =
    selectedForm?.name ??
    step.formName ??
    (step.formTemplateId ? (isRTL ? 'نموذج غير معروف' : 'Unknown form') : '')

  return (
    <div
      ref={setNodeRef}
      style={style}
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`rounded-xl border bg-white dark:bg-card p-3.5 space-y-3 shadow-sm ${
        isDragging ? 'opacity-80 shadow-md z-10 ring-1 ring-border' : ''
      }`}
    >
      <div className={cn("flex items-center justify-between gap-2", isRTL ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("flex items-center gap-1 min-w-0", isRTL ? "flex-row-reverse" : "flex-row")}>
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 shrink-0 rounded-sm hover:bg-muted/60 transition-colors"
            aria-label={`Drag to reorder step ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium">{t('admin.wizards.stepSingular')} {index + 1}</p>
        </div>

        <div className={cn("flex flex-1 items-center justify-end gap-3 flex-wrap", isRTL ? "flex-row-reverse justify-start" : "flex-row justify-end")}>
          {step.formTemplateId && onEditForm && (
            <button
              type="button"
              onClick={() => onEditForm(step.formTemplateId)}
              className={cn("flex items-center gap-1 text-sm text-muted-foreground hover:underline hover:text-emerald-600 transition-colors duration-200 cursor-pointer", isRTL && "flex-row-reverse")}
              aria-label={`Edit form for step ${index + 1}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('admin.wizards.modal.editForm')}
            </button>
          )}

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
              onClick={() => onRemove(step.id)}
              aria-label={`Remove step ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className={cn("w-full sm:w-1/2 space-y-1.5", isRTL ? "text-right" : "text-left")}>
        <Label className="text-sm font-medium">{t('admin.wizards.modal.formLabel')}</Label>
        <Input
          value={displayName}
          disabled
          readOnly
          placeholder={isRTL ? 'لم يتم تعيين نموذج' : 'No form assigned'}
          className={cn("bg-muted/80 text-muted-foreground cursor-not-allowed disabled:opacity-80 disabled:cursor-not-allowed", isRTL ? "text-right" : "text-left")}
        />
      </div>

      <div className={cn("flex flex-wrap items-center gap-4 pt-1 border-t border-border/60", isRTL ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Checkbox
            id={`payment-${step.id}`}
            checked={step.paymentRequired}
            onCheckedChange={(checked) =>
              onUpdate(step.id, { paymentRequired: checked === true })
            }
          />
          <Label
            htmlFor={`payment-${step.id}`}
            className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
          >
            {t('client.fill.payment')} {isRTL ? 'مطلوب' : 'required'}
          </Label>
        </div>

        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Checkbox
            id={`approval-${step.id}`}
            checked={step.approvalRequired}
            onCheckedChange={(checked) =>
              onUpdate(step.id, { approvalRequired: checked === true })
            }
          />
          <Label
            htmlFor={`approval-${step.id}`}
            className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
          >
            {isRTL ? 'الموافقة مطلوبة' : 'Approval required'}
          </Label>
        </div>

        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Checkbox
            id={`admin-use-${step.id}`}
            checked={Boolean(step.adminUseOnly)}
            onCheckedChange={(checked) =>
              onUpdate(step.id, { adminUseOnly: checked === true })
            }
          />
          <Label
            htmlFor={`admin-use-${step.id}`}
            className="text-sm font-normal cursor-pointer whitespace-nowrap text-muted-foreground"
          >
            {t('client.fill.adminOnly')}
          </Label>
        </div>
      </div>
    </div>
  )
}
