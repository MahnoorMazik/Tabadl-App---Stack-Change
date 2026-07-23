import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/rbac-middleware'
import { getAllPermissions, getModuleInfo, getActionInfo, Module, Action } from '@/lib/rbac'

// Get all available permissions organized by module
export const GET = withAdmin(async (req) => {
  try {
    const allPermissions = getAllPermissions()
    
    // Group permissions by module
    const permissionsByModule = Object.values(Module).map(module => {
      const modulePermissions = allPermissions
        .filter(permission => permission.startsWith(`${module}.`))
        .map(permission => {
          const [, action] = permission.split('.')
          return {
            permission,
            action: action as Action,
            actionInfo: getActionInfo(action as Action)
          }
        })

      return {
        module,
        moduleInfo: getModuleInfo(module),
        permissions: modulePermissions
      }
    })

    return NextResponse.json({ 
      permissions: allPermissions,
      permissionsByModule 
    })
  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
