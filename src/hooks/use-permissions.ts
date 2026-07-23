'use client'

import { useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Permission } from '@/lib/rbac'

interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  suggestions?: string[]
}

export function usePermissions() {
  const { user } = useAuth()
  
  const permissions = useMemo(() => {
    return new Set(user?.permissions || [])
  }, [user?.permissions])

  const hasPermission = useCallback((permission: Permission | Permission[]): boolean => {
    if (!user) return false
    
    if (Array.isArray(permission)) {
      return permission.some(p => hasPermission(p))
    }

    // Check exact permission
    if (permissions.has(permission)) return true

    // Check wildcard permissions
    const parts = permission.split('.')
    for (let i = parts.length; i > 0; i--) {
      const wildcard = parts.slice(0, i - 1).concat('*').join('.')
      if (permissions.has(wildcard as Permission)) return true
    }

    // Check if user has admin wildcard
    if (permissions.has('*.*' as Permission)) return true

    return false
  }, [permissions, user])

  const hasAllPermissions = useCallback((permissionList: Permission[]): boolean => {
    return permissionList.every(permission => hasPermission(permission))
  }, [hasPermission])

  const hasAnyPermission = useCallback((permissionList: Permission[]): boolean => {
    return permissionList.some(permission => hasPermission(permission))
  }, [hasPermission])

  const checkPermissionWithReason = useCallback((permission: Permission): PermissionCheckResult => {
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated',
        suggestions: ['Please log in to access this feature']
      }
    }

    if (hasPermission(permission)) {
      return { allowed: true }
    }

    // Provide helpful feedback
    const [module, action] = permission.split('.')
    
    // Check if user has any permission in this module
    const modulePermissions = Array.from(permissions).filter(p => 
      p.startsWith(`${module}.`)
    )

    if (modulePermissions.length === 0) {
      return {
        allowed: false,
        reason: `No access to ${module} module`,
        suggestions: ['Contact your administrator to request access']
      }
    }

    // User has some permissions in module but not this specific action
    return {
      allowed: false,
      reason: `Cannot perform '${action}' action on ${module}`,
      suggestions: [
        `You have access to: ${modulePermissions.map(p => p.split('.')[1]).join(', ')}`,
        'Request additional permissions from your administrator'
      ]
    }
  }, [user, permissions, hasPermission])

  const canAccessModule = useCallback((module: string): boolean => {
    if (!user) return false
    
    // Check for any permission in the module
    return Array.from(permissions).some(p => p.startsWith(`${module}.`))
  }, [user, permissions])

  const getModulePermissions = useCallback((module: string): Permission[] => {
    if (!user) return []
    
    return Array.from(permissions).filter(p => 
      p.startsWith(`${module}.`)
    ) as Permission[]
  }, [user, permissions])

  const getMissingPermissions = useCallback((required: Permission[]): Permission[] => {
    return required.filter(permission => !hasPermission(permission))
  }, [hasPermission])

  return {
    // Basic checks
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    
    // Advanced checks
    checkPermissionWithReason,
    canAccessModule,
    getModulePermissions,
    getMissingPermissions,
    
    // User info
    isAuthenticated: !!user,
    isAdmin: user?.staffType === 'ADMIN',
    isStaff: user?.role === 'STAFF',
    isClient: user?.role === 'CLIENT',
    
    // Raw data
    permissions: Array.from(permissions),
    user
  }
}

// Specialized hooks for common permission patterns
export function useCanView(module: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(`${module}.view` as Permission)
}

export function useCanCreate(module: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(`${module}.create` as Permission)
}

export function useCanUpdate(module: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(`${module}.update` as Permission)
}

export function useCanDelete(module: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(`${module}.delete` as Permission)
}

export function useCanManage(module: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(`${module}.manage` as Permission) || hasPermission(`${module}.*` as Permission)
}

// Hook for resource-specific permissions
export function useResourcePermissions(resourceType: string, resourceId?: string) {
  const { hasPermission, user } = usePermissions()
  
  const checkResourcePermission = useCallback((action: string, resource?: any): boolean => {
    const basePermission = `${resourceType}.${action}` as Permission
    
    // First check base permission
    if (!hasPermission(basePermission)) {
      // Check for ownership-based permissions
      if (resource && resource.ownerId === user?.id) {
        return hasPermission(`${resourceType}.${action}.own` as Permission)
      }
      
      // Check for team-based permissions
      // Note: teamId is not currently in User type
      if (resource && (resource as any).teamId) {
        return hasPermission(`${resourceType}.${action}.team` as Permission)
      }
      
      return false
    }
    
    return true
  }, [hasPermission, resourceType, user])

  return {
    canView: (resource?: any) => checkResourcePermission('view', resource),
    canCreate: () => checkResourcePermission('create'),
    canUpdate: (resource?: any) => checkResourcePermission('update', resource),
    canDelete: (resource?: any) => checkResourcePermission('delete', resource),
    canApprove: (resource?: any) => checkResourcePermission('approve', resource),
    canAssign: (resource?: any) => checkResourcePermission('assign', resource)
  }
}