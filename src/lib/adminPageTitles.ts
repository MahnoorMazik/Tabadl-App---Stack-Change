/** Resolve a human-readable admin page title from a pathname. */
export function resolveAdminPageTitle(pathname: string): string {
  const PAGE_TITLE_MAP: Record<string, string> = {
    '^/admin/dashboard$': 'Dashboard',
    '^/admin/leads$': 'Lead Management',
    '^/admin/leads/statuses$': 'Lead Statuses',
    '^/admin/leads/import$': 'Import Leads',
    '^/admin/clients$': 'All Clients',
    '^/admin/clients/new$': 'New Client',
    '^/admin/clients/import$': 'Import Clients',
    '^/admin/client-groups$': 'Client Groups',
    '^/admin/applications$': 'Applications',
    '^/admin/tasks$': 'Tasks',
    '^/admin/documents$': 'Document Library',
    '^/admin/documents/upload$': 'Upload Documents',
    '^/admin/documents/templates$': 'Document Templates',
    '^/admin/documents/archived$': 'Archived Documents',
    '^/admin/team$': 'Team Members',
    '^/admin/roles$': 'Roles & Permissions',
    '^/admin/financial$': 'Financial Overview',
    '^/admin/invoices$': 'Invoices',
    '^/admin/payments$': 'Payments',
    '^/admin/expenses$': 'Expenses',
    '^/admin/messages$': 'Inbox',
    '^/admin/messages/inbox$': 'WhatsApp Inbox',
    '^/admin/messages/support$': 'Support Messaging',
    '^/admin/messages/templates$': 'Message Templates',
    '^/admin/reports$': 'Reports',
    '^/admin/notifications$': 'Notifications',
    '^/admin/notifications/settings$': 'Notification Preferences',
    '^/admin/notifications/events$': 'Notification Event Settings',
    '^/admin/audit-logs$': 'Audit Logs',
    '^/admin/audit-logs/activity$': 'User Activity',
    '^/admin/settings$': 'General Settings',
    '^/admin/settings/email$': 'Email Settings',
    '^/admin/settings/payment-gateway$': 'Payment Gateway',
    '^/admin/settings/chatbot$': 'AI Chatbot',
    '^/admin/users$': 'User Management',
    '^/admin/services$': 'Services Catalog',
    '^/admin/services/packages$': 'Service Packages',
    '^/admin/services/add-ons$': 'Additional Services',
    '^/admin/settings/system$': 'System Configuration',
    '^/admin/settings/backup$': 'Backup & Restore',
    '^/admin/help$': 'Help & Support',
  }

  for (const [pattern, pageTitle] of Object.entries(PAGE_TITLE_MAP)) {
    if (new RegExp(pattern).test(pathname)) return pageTitle
  }

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  if (segments.length === 0) return 'Admin'
  return segments.map(capitalize).join(' - ')
}

const SKIP_PATTERNS = [
  /^\/admin\/login$/,
  /^\/admin\/api\//,
  /^\/_next\//,
  /^\/api\//,
]

export function shouldTrackAdminPageAccess(pathname: string): boolean {
  if (!pathname.startsWith('/admin')) return false
  return !SKIP_PATTERNS.some((p) => p.test(pathname))
}
