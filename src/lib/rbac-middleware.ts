import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { UserRole, StaffType } from '@prisma/client'
import { db } from '@/lib/db'
import { PermissionChecker, Permission, Module, Action, getDefaultRoleByName, MAIN_ROLE_NAMES } from '@/lib/rbac'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string
    email: string
    role: UserRole
    staffType?: StaffType | null
    name: string | null
    permissions?: Permission[]
  }
}

// Enhanced auth middleware with RBAC using NextAuth
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const session = await auth()

    if (!session?.user) {
      console.log('❌ No session found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch permissions on-demand since they're no longer in session
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: { customRole: true }
    })

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Get permissions using the existing getUserPermissions function
    const permissions = await getUserPermissions({
      role: dbUser.role,
      staffType: dbUser.staffType,
      customRoleId: dbUser.customRoleId,
      customRole: dbUser.customRole
    })

    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      staffType: session.user.staffType,
      name: session.user.name,
      permissions: permissions
    }

    return handler(authenticatedReq)
  }
}

// Role-based middleware
export function withRole(allowedRoles: UserRole[]) {
  return function(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return handler(req)
    })
  }
}

// Permission-based middleware
export function withPermission(requiredPermissions: Permission[]) {
  return function(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!req.user || !req.user.permissions) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const permissionChecker = new PermissionChecker(
        req.user.permissions,
        req.user.role,
        req.user.staffType || StaffType.ADMIN
      )

      const hasRequiredPermissions = requiredPermissions.every(permission =>
        permissionChecker.hasPermission(permission)
      )

      if (!hasRequiredPermissions) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return handler(req)
    })
  }
}

// Module access middleware
export function withModuleAccess(module: Module) {
  return function(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!req.user || !req.user.permissions) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const permissionChecker = new PermissionChecker(
        req.user.permissions,
        req.user.role,
        req.user.staffType || StaffType.ADMIN
      )

      if (!permissionChecker.canAccessModule(module)) {
        return NextResponse.json(
          { error: 'Access denied to this module' },
          { status: 403 }
        )
      }

      return handler(req)
    })
  }
}

// Staff type specific middleware
export function withStaffType(allowedStaffTypes: StaffType[]) {
  return function(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!req.user || req.user.role !== UserRole.STAFF || !req.user.staffType) {
        return NextResponse.json(
          { error: 'Staff access required' },
          { status: 403 }
        )
      }

      if (!allowedStaffTypes.includes(req.user.staffType)) {
        return NextResponse.json(
          { error: 'Insufficient staff permissions' },
          { status: 403 }
        )
      }

      return handler(req)
    })
  }
}

// Admin only middleware
export function withAdmin(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (req: AuthenticatedRequest) => {
    if (!req.user || req.user.role !== UserRole.STAFF || req.user.staffType !== StaffType.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return handler(req)
  })
}

// Admin middleware for Next.js API routes with params (Next.js 15 compatible)
export function withAdminParams(handler: (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => Promise<NextResponse>) {
  return async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const authResult = await requireAuth(req)
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    if (!authResult.user || authResult.user.role !== UserRole.STAFF || authResult.user.staffType !== StaffType.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = authResult.user

    return handler(authenticatedReq, { params })
  }
}

// Get user permissions from database or defaults
export async function getUserPermissions(user: {
  role: UserRole
  staffType: StaffType | null
  customRoleId?: string | null
  customRole?: { permissions: string | null; isActive: boolean } | null
}): Promise<Permission[]> {
  // Safety check for user object
  if (!user || typeof user !== 'object') {
    console.error('getUserPermissions: Invalid user object:', user)
    return []
  }

  // If user has custom role, use those permissions
  if (user.customRole && user.customRole.isActive && user.customRole.permissions) {
    try {
      return JSON.parse(user.customRole.permissions)
    } catch (error) {
      console.error('Error parsing role permissions:', error)
      return []
    }
  }

  // Fallback: staff with no customRole – Admin (staffType ADMIN) gets Admin permissions
  if (user.role === UserRole.STAFF && user.staffType === StaffType.ADMIN) {
    const adminRole = getDefaultRoleByName(MAIN_ROLE_NAMES.ADMIN)
    return adminRole?.permissions ?? []
  }
  if (user.role === UserRole.STAFF) return []

  // Client permissions (minimal)
  if (user.role === UserRole.CLIENT) {
    return [
      'dashboard.view',
      'applications.view',
      'documents.view',
      'messages.view',
      'help.view'
    ] as Permission[]
  }

  return []
}

// Check if user can perform action
export async function checkUserPermission(
  userId: string, 
  permission: Permission
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { customRole: true }
  })

  if (!user) return false

  const permissions = await getUserPermissions(user)
  const permissionChecker = new PermissionChecker(
    permissions,
    user.role,
    user.staffType || StaffType.ADMIN
  )

  return permissionChecker.hasPermission(permission)
}

// Get user's accessible modules
export async function getUserAccessibleModules(userId: string): Promise<Module[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { customRole: true }
  })

  if (!user) return []

  const permissions = await getUserPermissions(user)
  const permissionChecker = new PermissionChecker(
    permissions,
    user.role,
    user.staffType || StaffType.ADMIN
  )

  return permissionChecker.getAccessibleModules()
}

// Validate permissions array
export function validatePermissions(permissions: string[]): { valid: Permission[], invalid: string[] } {
  const valid: Permission[] = []
  const invalid: string[] = []

  for (const permission of permissions) {
    const [module, action] = permission.split('.')
    if (Object.values(Module).includes(module as Module) && 
        Object.values(Action).includes(action as Action)) {
      valid.push(permission as Permission)
    } else {
      invalid.push(permission)
    }
  }

  return { valid, invalid }
}

// Create permission checker from user ID
export async function createUserPermissionChecker(userId: string): Promise<PermissionChecker | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { customRole: true }
  })

  if (!user) return null

  const permissions = await getUserPermissions(user)
  return new PermissionChecker(
    permissions,
    user.role,
    user.staffType || StaffType.ADMIN
  )
}

// Simple auth middleware that returns user info using NextAuth
export async function requireAuth(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return { error: 'Authentication required', status: 401 }
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    include: { customRole: true }
  })

  if (!dbUser || !dbUser.isActive) {
    return { error: 'User not found or inactive', status: 401 }
  }

  const permissions = await getUserPermissions({
    role: dbUser.role,
    staffType: dbUser.staffType,
    customRoleId: dbUser.customRoleId,
    customRole: dbUser.customRole
  })

  return {
    user: {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      staffType: dbUser.staffType,
      name: dbUser.name,
      permissions
    }
  }
}

// Admin auth middleware
export async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request)
  
  if ('error' in authResult) {
    return authResult
  }

  if (!authResult.user || authResult.user.role !== UserRole.STAFF || authResult.user.staffType !== StaffType.ADMIN) {
    return { error: 'Admin access required', status: 403 }
  }

  return authResult
}
