// Enhanced RBAC System with Hierarchical Permissions

export interface HierarchicalPermission {
  id: string
  name: string
  description: string
  parent?: string
  implies?: string[] // Permissions that are automatically granted
  excludes?: string[] // Permissions that cannot coexist
  context?: {
    resourceType?: string
    conditions?: Record<string, any>
  }
}

// Example hierarchical permissions
export const HIERARCHICAL_PERMISSIONS: Record<string, HierarchicalPermission> = {
  // Top-level permissions
  'admin.*': {
    id: 'admin.*',
    name: 'Full Admin Access',
    description: 'Complete system administration',
    implies: ['*.*'] // Grants all permissions
  },
  
  // Module-level wildcards
  'clients.*': {
    id: 'clients.*',
    name: 'Full Client Management',
    description: 'All client-related permissions',
    implies: [
      'clients.view',
      'clients.create',
      'clients.update',
      'clients.delete',
      'clients.export',
      'clients.import'
    ]
  },
  
  // Contextual permissions
  'clients.update.own': {
    id: 'clients.update.own',
    name: 'Update Own Client Data',
    description: 'Update only client data owned by user',
    parent: 'clients.update',
    context: {
      resourceType: 'client',
      conditions: { ownership: 'self' }
    }
  },
  
  'clients.update.team': {
    id: 'clients.update.team',
    name: 'Update Team Clients',
    description: 'Update clients assigned to user\'s team',
    parent: 'clients.update',
    context: {
      resourceType: 'client',
      conditions: { ownership: 'team' }
    }
  }
}

// Dynamic permission evaluation
export class HierarchicalPermissionChecker {
  private permissions: Set<string>
  private context: Record<string, any>

  constructor(permissions: string[], context: Record<string, any> = {}) {
    this.permissions = new Set(permissions)
    this.context = context
    this.expandPermissions()
  }

  private expandPermissions() {
    const expanded = new Set(this.permissions)
    
    for (const perm of this.permissions) {
      // Handle wildcards
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -2)
        Object.keys(HIERARCHICAL_PERMISSIONS).forEach(key => {
          if (key.startsWith(prefix + '.')) {
            expanded.add(key)
          }
        })
      }
      
      // Handle implied permissions
      const permDef = HIERARCHICAL_PERMISSIONS[perm]
      if (permDef?.implies) {
        permDef.implies.forEach(implied => expanded.add(implied))
      }
    }
    
    this.permissions = expanded
  }

  hasPermission(permission: string, resource?: any): boolean {
    // Check wildcard permissions
    if (this.permissions.has('*.*')) return true
    
    const parts = permission.split('.')
    for (let i = parts.length; i > 0; i--) {
      const wildcard = parts.slice(0, i - 1).concat('*').join('.')
      if (this.permissions.has(wildcard)) return true
    }
    
    // Check exact permission
    if (!this.permissions.has(permission)) return false
    
    // Check contextual conditions
    const permDef = HIERARCHICAL_PERMISSIONS[permission]
    if (permDef?.context && resource) {
      return this.evaluateContext(permDef.context, resource)
    }
    
    return true
  }

  private evaluateContext(context: HierarchicalPermission['context'], resource: any): boolean {
    if (!context) return true
    
    if (context.conditions?.ownership === 'self') {
      return resource.userId === this.context.userId
    }
    
    if (context.conditions?.ownership === 'team') {
      return resource.teamId === this.context.teamId
    }
    
    return true
  }
}