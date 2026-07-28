/** Shared wizard-application status labels + colors */

export const WIZARD_APP_STATUSES = [
  'DRAFT',
  'PENDING',
  'IN_PROGRESS',
  'HARD_COPY_REQUIRED',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
] as const

export type WizardAppStatus = (typeof WIZARD_APP_STATUSES)[number]

export function wizardStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'In progress'
    case 'PENDING':
      return 'Pending'
    case 'IN_PROGRESS':
      return 'Under review'
    case 'HARD_COPY_REQUIRED':
      return 'Hard copy required'
    case 'APPROVED':
      return 'Approved'
    case 'REJECTED':
      return 'Rejected'
    case 'COMPLETED':
      return 'Completed'
    default:
      return status
  }
}

/** Tailwind classes for solid/soft status chips */
export function wizardStatusClasses(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-200 text-slate-800 border-slate-300'
    case 'PENDING':
      return 'bg-amber-200 text-amber-900 border-amber-300'
    case 'IN_PROGRESS':
      return 'bg-sky-200 text-sky-900 border-sky-300'
    case 'HARD_COPY_REQUIRED':
      return 'bg-orange-200 text-orange-950 border-orange-400'
    case 'APPROVED':
      return 'bg-emerald-200 text-emerald-900 border-emerald-300'
    case 'COMPLETED':
      return 'bg-teal-200 text-teal-900 border-teal-300'
    case 'REJECTED':
      return 'bg-red-200 text-red-900 border-red-300'
    default:
      return 'bg-muted text-foreground border-border'
  }
}

export function wizardStatusSelectTriggerClasses(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-100 border-slate-300 text-slate-800'
    case 'PENDING':
      return 'bg-amber-100 border-amber-300 text-amber-900'
    case 'IN_PROGRESS':
      return 'bg-sky-100 border-sky-300 text-sky-900'
    case 'HARD_COPY_REQUIRED':
      return 'bg-orange-100 border-orange-400 text-orange-950 font-medium'
    case 'APPROVED':
      return 'bg-emerald-100 border-emerald-300 text-emerald-900'
    case 'COMPLETED':
      return 'bg-teal-100 border-teal-300 text-teal-900'
    case 'REJECTED':
      return 'bg-red-100 border-red-300 text-red-900'
    default:
      return ''
  }
}
