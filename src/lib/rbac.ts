import { StaffType } from '@prisma/client'

/** Main system roles. Sidebar and page visibility are driven by these. */
export const MAIN_ROLE_NAMES = {
  ADMIN: 'Admin',
  CLIENTS: 'Clients',
  REPORTS: 'Reports',
  SUPPORT: 'Support',
} as const

// Define system modules
export enum Module {
  DASHBOARD = 'dashboard',
  CLIENTS = 'clients',
  LEADS = 'leads',
  APPLICATIONS = 'applications',
  DOCUMENTS = 'documents',
  TEAM = 'team',
  COLLABORATORS = 'collaborators', // ✅ ADDED
  FINANCIAL = 'financial',
  MESSAGES = 'messages',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  HELP = 'help',
  USER_MANAGEMENT = 'user_management',
  ROLE_MANAGEMENT = 'role_management',
  SUPPORT = 'support',
  TASKS = 'tasks',
  INVOICES = 'invoices',
  PAYMENTS = 'payments',
  EXPENSES = 'expenses',
  ANALYTICS = 'analytics',
  AUDIT = 'audit',
  SERVICES = 'services',
}

// Define actions within modules
export enum Action {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  ASSIGN = 'assign',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage'
}

// Permission type
export type Permission = `${Module}.${Action}`

// Role interface (staffTypes optional; main roles use customRole only)
export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isDefault: boolean
  isProtected: boolean
  staffTypes?: StaffType[]
}

// Default roles: Admin, Clients, Reports, Support. Page/sidebar visibility is based on these.
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: MAIN_ROLE_NAMES.ADMIN,
    description: 'Super user. Access to every page and every option.',
    isDefault: true,
    isProtected: true,
    staffTypes: [StaffType.ADMIN],
    permissions: Object.values(Module).flatMap(module =>
      Object.values(Action).map(action => `${module}.${action}`)
    ) as Permission[]
  },
  {
    id: 'clients',
    name: MAIN_ROLE_NAMES.CLIENTS,
    description: 'Client management only. Leads, clients, applications, documents.',
    isDefault: true,
    isProtected: false,
    permissions: [
      `${Module.DASHBOARD}.${Action.VIEW}`,
      `${Module.CLIENTS}.${Action.VIEW}`,
      `${Module.CLIENTS}.${Action.CREATE}`,
      `${Module.CLIENTS}.${Action.UPDATE}`,
      `${Module.CLIENTS}.${Action.DELETE}`,
      `${Module.CLIENTS}.${Action.IMPORT}`,
      `${Module.LEADS}.${Action.VIEW}`,
      `${Module.LEADS}.${Action.CREATE}`,
      `${Module.LEADS}.${Action.UPDATE}`,
      `${Module.LEADS}.${Action.DELETE}`,
      `${Module.LEADS}.${Action.IMPORT}`,
      `${Module.LEADS}.${Action.ASSIGN}`,
      `${Module.APPLICATIONS}.${Action.VIEW}`,
      `${Module.APPLICATIONS}.${Action.CREATE}`,
      `${Module.APPLICATIONS}.${Action.UPDATE}`,
      `${Module.APPLICATIONS}.${Action.ASSIGN}`,
      `${Module.APPLICATIONS}.${Action.APPROVE}`,
      `${Module.DOCUMENTS}.${Action.VIEW}`,
      `${Module.DOCUMENTS}.${Action.CREATE}`,
      `${Module.DOCUMENTS}.${Action.UPDATE}`,
      `${Module.DOCUMENTS}.${Action.APPROVE}`,
      `${Module.SERVICES}.${Action.VIEW}`,
      `${Module.SERVICES}.${Action.CREATE}`,
      `${Module.SERVICES}.${Action.UPDATE}`,
      `${Module.SERVICES}.${Action.DELETE}`,
      `${Module.TASKS}.${Action.VIEW}`,
      `${Module.TASKS}.${Action.CREATE}`,
      `${Module.TASKS}.${Action.UPDATE}`,
      `${Module.TASKS}.${Action.ASSIGN}`,
      `${Module.HELP}.${Action.VIEW}`
    ]
  },
  {
    id: 'reports',
    name: MAIN_ROLE_NAMES.REPORTS,
    description: 'Reports section only.',
    isDefault: true,
    isProtected: false,
    permissions: [
      `${Module.DASHBOARD}.${Action.VIEW}`,
      `${Module.REPORTS}.${Action.VIEW}`,
      `${Module.REPORTS}.${Action.EXPORT}`,
      `${Module.HELP}.${Action.VIEW}`
    ]
  },
  {
    id: 'support',
    name: MAIN_ROLE_NAMES.SUPPORT,
    description: 'Messages and sub-options only. Inbox, support messaging, templates.',
    isDefault: true,
    isProtected: false,
    permissions: [
      `${Module.DASHBOARD}.${Action.VIEW}`,
      `${Module.MESSAGES}.${Action.VIEW}`,
      `${Module.MESSAGES}.${Action.CREATE}`,
      `${Module.MESSAGES}.${Action.UPDATE}`,
      `${Module.SUPPORT}.${Action.VIEW}`,
      `${Module.SUPPORT}.${Action.CREATE}`,
      `${Module.SUPPORT}.${Action.UPDATE}`,
      `${Module.HELP}.${Action.VIEW}`
    ]
  }
]

// Permission checking utilities
export class PermissionChecker {
  private userPermissions: Permission[]
  private userRole: string
  private userStaffType: StaffType

  constructor(permissions: Permission[], role: string, staffType: StaffType) {
    this.userPermissions = permissions
    this.userRole = role
    this.userStaffType = staffType
  }

  // Check if user has specific permission
  hasPermission(permission: Permission): boolean {
    return this.userPermissions.includes(permission)
  }

  // Check if user has any of the specified permissions
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }

  // Check if user has all of the specified permissions
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }

  // Check if user can access a module
  canAccessModule(module: Module): boolean {
    return this.hasAnyPermission([
      `${module}.${Action.VIEW}`,
      `${module}.${Action.CREATE}`,
      `${module}.${Action.UPDATE}`,
      `${module}.${Action.DELETE}`,
      `${module}.${Action.MANAGE}`
    ])
  }

  // Check if user can perform action on module
  canPerformAction(module: Module, action: Action): boolean {
    return this.hasPermission(`${module}.${action}`)
  }

  // Get user's accessible modules
  getAccessibleModules(): Module[] {
    return Object.values(Module).filter(module => this.canAccessModule(module))
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.userStaffType === StaffType.ADMIN
  }

  // Check if user has role
  hasRole(roleId: string): boolean {
    return this.userRole === roleId
  }

  // Get filtered permissions for a module
  getModulePermissions(module: Module): Permission[] {
    return this.userPermissions.filter(permission => permission.startsWith(`${module}.`))
  }
}

// Create permission checker from user data
export function createPermissionChecker(
  permissions: Permission[], 
  role: string, 
  staffType: StaffType
): PermissionChecker {
  return new PermissionChecker(permissions, role, staffType)
}

// Get default role for staff type (Admin only; others use customRole)
export function getDefaultRoleForStaffType(staffType: StaffType): Role | null {
  const r = DEFAULT_ROLES.find(role => role.staffTypes?.includes(staffType))
  return r ?? null
}

// Get default role by exact name (Admin, Clients, Reports, Support)
export function getDefaultRoleByName(name: string): Role | null {
  return DEFAULT_ROLES.find(r => r.name === name) ?? null
}

// Validate permission format
export function isValidPermission(permission: string): boolean {
  if (!permission || typeof permission !== 'string') {
    return false
  }
  
  const parts = permission.split('.')
  if (parts.length !== 2) {
    return false
  }
  
  const [module, action] = parts
  return Object.values(Module).includes(module as Module) && 
         Object.values(Action).includes(action as Action)
}

// Validate multiple permissions
export function validatePermissions(permissions: string[]): { 
  valid: string[], 
  invalid: string[] 
} {
  const valid: string[] = []
  const invalid: string[] = []

  for (const permission of permissions) {
    if (isValidPermission(permission)) {
      valid.push(permission)
    } else {
      invalid.push(permission)
    }
  }

  return { valid, invalid }
}

// Get all possible permissions
export function getAllPermissions(): Permission[] {
  return Object.values(Module).flatMap(module =>
    Object.values(Action).map(action => `${module}.${action}`)
  ) as Permission[]
}

// Get module display info
export function getModuleInfo(module: Module) {
  const moduleInfo = {
    [Module.DASHBOARD]: { name: 'Dashboard', description: 'Overview and analytics' },
    [Module.CLIENTS]: { name: 'Client Management', description: 'Manage client information and profiles' },
    [Module.LEADS]: { name: 'Lead Management', description: 'Track and manage potential clients' },
    [Module.APPLICATIONS]: { name: 'Applications', description: 'Manage client applications' },
    [Module.DOCUMENTS]: { name: 'Documents', description: 'Document management and approval' },
    [Module.TEAM]: { name: 'Team Management', description: 'Manage staff and team members' },
    [Module.COLLABORATORS]: { name: 'Collaborators', description: 'Manage collaborator invitations and access' }, // ✅ ADDED
    [Module.FINANCIAL]: { name: 'Financial', description: 'Financial overview and management' },
    [Module.MESSAGES]: { name: 'Messages', description: 'Internal and client communications' },
    [Module.REPORTS]: { name: 'Reports', description: 'Generate and view reports' },
    [Module.SETTINGS]: { name: 'Settings', description: 'System configuration and settings' },
    [Module.HELP]: { name: 'Help & Support', description: 'Help documentation and support' },
    [Module.USER_MANAGEMENT]: { name: 'User Management', description: 'Manage user accounts and access' },
    [Module.ROLE_MANAGEMENT]: { name: 'Role Management', description: 'Manage roles and permissions' },
    [Module.SUPPORT]: { name: 'Support', description: 'Customer support and ticketing' },
    [Module.TASKS]: { name: 'Tasks', description: 'Task management and assignment' },
    [Module.INVOICES]: { name: 'Invoices', description: 'Invoice creation and management' },
    [Module.PAYMENTS]: { name: 'Payments', description: 'Payment processing and tracking' },
    [Module.EXPENSES]: { name: 'Expenses', description: 'Expense tracking and approval' },
    [Module.ANALYTICS]: { name: 'Analytics', description: 'Business analytics and insights' },
    [Module.AUDIT]: { name: 'Audit Logs', description: 'System audit trails and user activity' },
    [Module.SERVICES]: { name: 'Services Catalog', description: 'Business services, packages, and pricing' },
  }
  return moduleInfo[module]
}

// Get action display info
export function getActionInfo(action: Action) {
  const actionInfo = {
    [Action.VIEW]: { name: 'View', description: 'View and read data' },
    [Action.CREATE]: { name: 'Create', description: 'Create new records' },
    [Action.UPDATE]: { name: 'Update', description: 'Modify existing records' },
    [Action.DELETE]: { name: 'Delete', description: 'Remove records' },
    [Action.APPROVE]: { name: 'Approve', description: 'Approve or reject items' },
    [Action.ASSIGN]: { name: 'Assign', description: 'Assign tasks or applications' },
    [Action.EXPORT]: { name: 'Export', description: 'Export data and reports' },
    [Action.IMPORT]: { name: 'Import', description: 'Import data from files' },
    [Action.MANAGE]: { name: 'Manage', description: 'Full management access' }
  }
  return actionInfo[action]
}

// Check if user can manage leads
export function canManageLeads(user: any): boolean {
  if (!user) return false
  
  // Staff can manage leads
  if (user.role === 'STAFF') return true
  
  // Clients cannot manage leads
  return false
}