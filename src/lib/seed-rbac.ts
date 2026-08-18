import { PrismaClient } from '@prisma/client'
import { DEFAULT_ROLES, getAllPermissions, Module, Action } from '@/lib/rbac'

const prisma = new PrismaClient()

export async function seedRBAC() {
  console.log('🌱 Seeding RBAC system...')

  try {
    // Create all possible permissions in the database
    console.log('Creating permissions...')
    const allPermissions = getAllPermissions()
    
    for (const permission of allPermissions) {
      const [module, action] = permission.split('.')
      
      await prisma.permission.upsert({
        where: {
          module_action: {
            module: module as Module,
            action: action as Action
          }
        },
        update: {},
        create: {
          module: module as Module,
          action: action as Action,
          description: `${action} permission for ${module} module`
        }
      })
    }

    // ✅ Ensure collaborator permissions are included in DEFAULT_ROLES
    // Update DEFAULT_ROLES in memory to include collaborator permissions
    const updatedDefaultRoles = DEFAULT_ROLES.map(role => {
      // For Admin role, ensure all collaborator permissions are included
      if (role.name === 'Admin') {
        const collaboratorPermissions = [
          'collaborators.view',
          'collaborators.create',
          'collaborators.update',
          'collaborators.delete',
          'collaborators.manage'
        ] as const
        
        // Add collaborator permissions if not already present
        const existingPermissions = new Set(role.permissions)
        let permissionsUpdated = false
        
        for (const perm of collaboratorPermissions) {
          if (!existingPermissions.has(perm)) {
            existingPermissions.add(perm)
            permissionsUpdated = true
          }
        }
        
        if (permissionsUpdated) {
          return {
            ...role,
            permissions: Array.from(existingPermissions) as any
          }
        }
      }
      
      // For other roles (Clients, Reports, Support), optionally add collaborator view
      if (role.name === 'Clients') {
        const collaboratorPermissions = [
          'collaborators.view',
        ] as const
        
        const existingPermissions = new Set(role.permissions)
        let permissionsUpdated = false
        
        for (const perm of collaboratorPermissions) {
          if (!existingPermissions.has(perm)) {
            existingPermissions.add(perm)
            permissionsUpdated = true
          }
        }
        
        if (permissionsUpdated) {
          return {
            ...role,
            permissions: Array.from(existingPermissions) as any
          }
        }
      }
      
      return role
    })

    // Create default roles with updated permissions
    console.log('Creating default roles with collaborator permissions...')
    for (const roleData of updatedDefaultRoles) {
      await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          permissions: JSON.stringify(roleData.permissions),
          description: roleData.description,
          isProtected: roleData.isProtected
        },
        create: {
          name: roleData.name,
          description: roleData.description,
          permissions: JSON.stringify(roleData.permissions),
          isDefault: roleData.isDefault,
          isProtected: roleData.isProtected
        }
      })
    }

    // ✅ Additional check: If admin role already exists, ensure collaborator permissions are added
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin', isDeleted: false }
    })

    if (adminRole) {
      let permissions = JSON.parse(adminRole.permissions || '[]')
      const collaboratorPermissions = [
        'collaborators.view',
        'collaborators.create',
        'collaborators.update',
        'collaborators.delete',
        'collaborators.manage'
      ]
      
      let updated = false
      for (const perm of collaboratorPermissions) {
        if (!permissions.includes(perm)) {
          permissions.push(perm)
          updated = true
        }
      }
      
      if (updated) {
        await prisma.role.update({
          where: { id: adminRole.id },
          data: { permissions: JSON.stringify(permissions) }
        })
        console.log('✅ Added collaborator permissions to existing Admin role')
      }
    }

    // ✅ Also update Clients role with collaborator view permission
    const clientsRole = await prisma.role.findUnique({
      where: { name: 'Clients', isDeleted: false }
    })

    if (clientsRole) {
      let permissions = JSON.parse(clientsRole.permissions || '[]')
      if (!permissions.includes('collaborators.view')) {
        permissions.push('collaborators.view')
        await prisma.role.update({
          where: { id: clientsRole.id },
          data: { permissions: JSON.stringify(permissions) }
        })
        console.log('✅ Added collaborators.view to Clients role')
      }
    }

    console.log('✅ RBAC seeding completed successfully!')
  } catch (error) {
    console.error('❌ RBAC seeding failed:', error)
    throw error
  }
}

const OLD_ROLE_NAMES = ['admin', 'staff', 'client'] as const

/** Remove legacy roles (admin, staff, client). Unassign users first, then soft-delete. */
export async function removeOldRoles() {
  console.log('🧹 Removing old roles (admin, staff, client)...')
  try {
    for (const name of OLD_ROLE_NAMES) {
      const role = await prisma.role.findFirst({
        where: { name, isDeleted: false },
        include: { _count: { select: { users: true } } }
      })
      if (!role) continue
      await prisma.user.updateMany({
        where: { customRoleId: role.id },
        data: { customRoleId: null }
      })
      await prisma.role.update({
        where: { id: role.id },
        data: { isDeleted: true, deletedAt: new Date() }
      })
      console.log(`   Removed old role: ${role.name} (${role._count.users} users unassigned)`)
    }
    console.log('✅ Old roles removed.')
  } catch (error) {
    console.error('❌ removeOldRoles failed:', error)
    throw error
  }
}

/** Assign Admin role to admin@tk.sa and other staff with staffType ADMIN and no customRole. */
export async function assignDefaultRoles() {
  console.log('🔧 Assigning default roles to existing users...')

  try {
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin', isDeleted: false }
    })
    if (!adminRole) {
      console.warn('⚠️ Admin role not found; run seedRBAC first.')
      return
    }

    const users = await prisma.user.findMany({
      where: {
        role: 'STAFF',
        customRoleId: null,
        isDeleted: false
      }
    })

    for (const user of users) {
      const isAdminUser = user.email === 'admin@tk.sa' || user.staffType === 'ADMIN'
      if (isAdminUser) {
        await prisma.user.update({
          where: { id: user.id },
          data: { customRoleId: adminRole.id }
        })
        console.log(`✅ Assigned Admin role to ${user.email ?? user.name}`)
      }
    }

    console.log('✅ Default role assignment completed!')
  } catch (error) {
    console.error('❌ Default role assignment failed:', error)
    throw error
  }
}