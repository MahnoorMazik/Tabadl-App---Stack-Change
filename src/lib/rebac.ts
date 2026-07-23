// Resource-Based Access Control (ReBAC) System

export interface Resource {
  id: string
  type: string
  ownerId: string
  teamId?: string
  departmentId?: string
  attributes: Record<string, any>
  permissions?: ResourcePermission[]
}

export interface ResourcePermission {
  userId?: string
  roleId?: string
  teamId?: string
  permission: string
  granted: boolean
  conditions?: Record<string, any>
  expiresAt?: Date
}

export interface AccessRule {
  id: string
  name: string
  resourceType: string
  permission: string
  conditions: AccessCondition[]
  priority: number
}

export interface AccessCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte'
  value: any
  contextField?: string // Field from context to compare against
}

export class ResourceAccessControl {
  constructor(
    private user: {
      id: string
      roleId: string
      teamId?: string
      departmentId?: string
      permissions: string[]
    },
    private rules: AccessRule[]
  ) {}

  canAccess(resource: Resource, permission: string): boolean {
    // Check direct resource permissions
    const directPermission = this.checkDirectPermissions(resource, permission)
    if (directPermission !== null) return directPermission

    // Check rule-based permissions
    const applicableRules = this.rules
      .filter(rule => rule.resourceType === resource.type && rule.permission === permission)
      .sort((a, b) => b.priority - a.priority)

    for (const rule of applicableRules) {
      if (this.evaluateRule(rule, resource)) {
        return true
      }
    }

    // Check role-based permissions as fallback
    return this.user.permissions.includes(`${resource.type}.${permission}`)
  }

  private checkDirectPermissions(resource: Resource, permission: string): boolean | null {
    if (!resource.permissions) return null

    // Check user-specific permissions
    const userPerm = resource.permissions.find(
      p => p.userId === this.user.id && p.permission === permission
    )
    if (userPerm) {
      return this.isPermissionValid(userPerm) ? userPerm.granted : null
    }

    // Check role-based permissions
    const rolePerm = resource.permissions.find(
      p => p.roleId === this.user.roleId && p.permission === permission
    )
    if (rolePerm) {
      return this.isPermissionValid(rolePerm) ? rolePerm.granted : null
    }

    // Check team-based permissions
    if (this.user.teamId) {
      const teamPerm = resource.permissions.find(
        p => p.teamId === this.user.teamId && p.permission === permission
      )
      if (teamPerm) {
        return this.isPermissionValid(teamPerm) ? teamPerm.granted : null
      }
    }

    return null
  }

  private isPermissionValid(perm: ResourcePermission): boolean {
    if (perm.expiresAt && new Date() > perm.expiresAt) {
      return false
    }
    return true
  }

  private evaluateRule(rule: AccessRule, resource: Resource): boolean {
    return rule.conditions.every(condition => 
      this.evaluateCondition(condition, resource)
    )
  }

  private evaluateCondition(condition: AccessCondition, resource: Resource): boolean {
    let fieldValue: any
    let compareValue: any

    // Get field value from resource
    if (condition.field.startsWith('resource.')) {
      const path = condition.field.substring(9).split('.')
      fieldValue = this.getNestedValue(resource, path)
    } else if (condition.field.startsWith('user.')) {
      const path = condition.field.substring(5).split('.')
      fieldValue = this.getNestedValue(this.user, path)
    }

    // Get comparison value
    if (condition.contextField) {
      if (condition.contextField.startsWith('user.')) {
        const path = condition.contextField.substring(5).split('.')
        compareValue = this.getNestedValue(this.user, path)
      }
    } else {
      compareValue = condition.value
    }

    // Evaluate condition
    switch (condition.operator) {
      case 'equals':
        return fieldValue === compareValue
      case 'not_equals':
        return fieldValue !== compareValue
      case 'contains':
        return Array.isArray(fieldValue) ? fieldValue.includes(compareValue) : false
      case 'in':
        return Array.isArray(compareValue) ? compareValue.includes(fieldValue) : false
      case 'not_in':
        return Array.isArray(compareValue) ? !compareValue.includes(fieldValue) : false
      case 'gt':
        return fieldValue > compareValue
      case 'lt':
        return fieldValue < compareValue
      case 'gte':
        return fieldValue >= compareValue
      case 'lte':
        return fieldValue <= compareValue
      default:
        return false
    }
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj)
  }
}

// Example usage:
export const exampleAccessRules: AccessRule[] = [
  {
    id: 'own-client-update',
    name: 'Update Own Clients',
    resourceType: 'client',
    permission: 'update',
    conditions: [
      {
        field: 'resource.ownerId',
        operator: 'equals',
        value: null,
        contextField: 'user.id'
      }
    ],
    priority: 100
  },
  {
    id: 'team-client-view',
    name: 'View Team Clients',
    resourceType: 'client',
    permission: 'view',
    conditions: [
      {
        field: 'resource.teamId',
        operator: 'equals',
        value: null,
        contextField: 'user.teamId'
      }
    ],
    priority: 90
  },
  {
    id: 'department-manager-all',
    name: 'Department Manager Access',
    resourceType: 'client',
    permission: 'manage',
    conditions: [
      {
        field: 'resource.departmentId',
        operator: 'equals',
        value: null,
        contextField: 'user.departmentId'
      },
      {
        field: 'user.permissions',
        operator: 'contains',
        value: 'department.manage'
      }
    ],
    priority: 110
  }
]