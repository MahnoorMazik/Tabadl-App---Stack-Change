export type NotificationModule =
  | 'Leads & Clients'
  | 'Applications'
  | 'Tasks'
  | 'Documents'
  | 'Messages'
  | 'Financial'
  | 'Security'
  | 'Reminders'

export interface EventDefinition {
  eventType: string
  label: string
  module: NotificationModule
  description: string
  defaultEmail: boolean
  defaultInApp: boolean
  defaultPush: boolean
  defaultRecipients: 'assigned' | 'all_admins' | 'both'
}

export const MODULES_ORDER: NotificationModule[] = [
  'Leads & Clients',
  'Applications',
  'Tasks',
  'Documents',
  'Messages',
  'Financial',
  'Security',
  'Reminders',
]

export const EVENT_REGISTRY: EventDefinition[] = [
  {
    eventType: 'LEAD_CREATION',
    label: 'New Lead Created',
    module: 'Leads & Clients',
    description: 'When a new lead is added to the system',
    defaultEmail: false,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'LEAD_FOLLOWUP',
    label: 'Lead Follow-up Scheduled',
    module: 'Leads & Clients',
    description: 'When a follow-up is scheduled for a lead',
    defaultEmail: false,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'CLIENT_CONVERSION',
    label: 'Lead Converted to Client',
    module: 'Leads & Clients',
    description: 'When a lead is converted into a client account',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'all_admins',
  },
  {
    eventType: 'CLIENT_CREATED',
    label: 'New Client Created',
    module: 'Leads & Clients',
    description: 'When a client account is created directly',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'all_admins',
  },
  {
    eventType: 'APPLICATION_ASSIGNED',
    label: 'Application Assigned',
    module: 'Applications',
    description: 'When an application is assigned to a staff member',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: true,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'APPLICATION_STATUS_CHANGED',
    label: 'Application Status Changed',
    module: 'Applications',
    description: 'When an application status is updated',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'both',
  },
  {
    eventType: 'TASK_ASSIGNED',
    label: 'Task Assigned',
    module: 'Tasks',
    description: 'When a task is assigned to a user',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: true,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'TASK_UPDATED',
    label: 'Task Updated',
    module: 'Tasks',
    description: 'When a task status or details change',
    defaultEmail: false,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'TASK_COMPLETED',
    label: 'Task Completed',
    module: 'Tasks',
    description: 'When a task is marked as completed',
    defaultEmail: false,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'all_admins',
  },
  {
    eventType: 'DOCUMENT_REVIEWED',
    label: 'Document Reviewed',
    module: 'Documents',
    description: 'When a document is approved or rejected',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'NEW_MESSAGE',
    label: 'New Message',
    module: 'Messages',
    description: 'When a new message is received in an application thread',
    defaultEmail: false,
    defaultInApp: true,
    defaultPush: true,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'INVOICE_CREATED',
    label: 'Invoice Created',
    module: 'Financial',
    description: 'When a new invoice is generated for a client',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'assigned',
  },
  {
    eventType: 'PAYMENT_RECEIVED',
    label: 'Payment Received',
    module: 'Financial',
    description: 'When a payment is recorded',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: false,
    defaultRecipients: 'all_admins',
  },
  {
    eventType: 'SECURITY_ALERT',
    label: 'Security Alert',
    module: 'Security',
    description: 'Login failures, suspicious activity, and auth events',
    defaultEmail: true,
    defaultInApp: true,
    defaultPush: true,
    defaultRecipients: 'all_admins',
  },
  {
    eventType: 'REMINDER',
    label: 'Follow-up Reminder',
    module: 'Reminders',
    description: 'Scheduled follow-up reminders for leads',
    defaultEmail: false,
    defaultInApp: true,
    defaultPush: true,
    defaultRecipients: 'assigned',
  },
]

export function getEventDefault(eventType: string): EventDefinition {
  const found = EVENT_REGISTRY.find((e) => e.eventType === eventType)
  if (!found) {
    return {
      eventType,
      label: eventType,
      module: 'Security',
      description: '',
      defaultEmail: false,
      defaultInApp: true,
      defaultPush: false,
      defaultRecipients: 'assigned',
    }
  }
  return found
}

export function getEventsByModule(): Map<NotificationModule, EventDefinition[]> {
  const map = new Map<NotificationModule, EventDefinition[]>()
  for (const mod of MODULES_ORDER) map.set(mod, [])
  for (const def of EVENT_REGISTRY) {
    map.get(def.module)?.push(def)
  }
  return map
}
