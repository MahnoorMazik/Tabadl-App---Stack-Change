import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth/config'
import { Module, Action, validatePermissions } from '@/lib/rbac'
import { sanitizeRoleName, sanitizeRoleDescription } from '@/lib/sanitize'
import { getUserPermissions } from '@/lib/rbac-middleware'
import { z } from 'zod'

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
})

// Get specific role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const role = await db.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            staffType: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Get role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check authentication using NextAuth
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user with permissions
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { customRole: true }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Check if user has role management update permission
    const userPermissions = await getUserPermissions(user)
    const hasPermission = userPermissions.includes(`${Module.ROLE_MANAGEMENT}.${Action.UPDATE}`)

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, permissions, isActive } = updateRoleSchema.parse(body)

    // Sanitize input to prevent XSS
    const sanitizedName = name ? sanitizeRoleName(name) : undefined
    const sanitizedDescription = description ? sanitizeRoleDescription(description) : undefined

    if (sanitizedName !== undefined && sanitizedName === '') {
      return NextResponse.json(
        { error: 'Role name cannot be empty after sanitization' },
        { status: 400 }
      )
    }

    // Check if role exists
    const existingRole = await db.role.findUnique({
      where: { id }
    })

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Check if role is protected
    if (existingRole.isProtected) {
      return NextResponse.json(
        { error: 'Cannot modify protected role' },
        { status: 403 }
      )
    }

    // Check if name is being changed and if it conflicts
    if (sanitizedName && sanitizedName !== existingRole.name) {
      const nameConflict = await db.role.findUnique({
        where: { name: sanitizedName }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Role with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Validate permissions if provided
    if (permissions) {
      const { valid: validPermissions, invalid: invalidPermissions } = validatePermissions(permissions)

      // Log invalid permissions but don't fail the request
      if (invalidPermissions.length > 0) {
        console.warn('Invalid permissions filtered out:', invalidPermissions)
      }

      // Ensure we have at least one valid permission
      if (validPermissions.length === 0) {
        return NextResponse.json(
          { 
            error: 'No valid permissions provided', 
            invalidPermissions,
            validModules: Object.values(Module),
            validActions: Object.values(Action)
          },
          { status: 400 }
        )
      }
    }

    // Update role
    const updateData: any = {}
    if (sanitizedName !== undefined) updateData.name = sanitizedName
    if (sanitizedDescription !== undefined) updateData.description = sanitizedDescription
    if (permissions !== undefined) {
      const { valid: validPermissions } = validatePermissions(permissions)
      updateData.permissions = JSON.stringify(validPermissions)
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const role = await db.role.update({
      where: { id },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            staffType: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Update role error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      console.error('Database error:', error.message)
      return NextResponse.json(
        { error: 'Database operation failed', details: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error?.toString() },
      { status: 500 }
    )
  }
}

// Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check authentication using NextAuth
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user with permissions
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { customRole: true }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Check if user has role management delete permission
    const userPermissions = await getUserPermissions(user)
    const hasPermission = userPermissions.includes(`${Module.ROLE_MANAGEMENT}.${Action.DELETE}`)

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    console.log('Attempting to delete role with ID:', id)
    
    // Check if role exists
    const existingRole = await db.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    console.log('Found role:', existingRole ? 'Yes' : 'No')

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Check if role is protected
    if (existingRole.isProtected) {
      return NextResponse.json(
        { error: 'Cannot delete protected role' },
        { status: 403 }
      )
    }

    // Check if role has users
    if (existingRole._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role with assigned users' },
        { status: 409 }
      )
    }

    console.log('Attempting soft delete...')
    // Soft delete role (mark as deleted, keep ID and data)
    await db.role.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    console.log('Role deleted successfully')
    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Delete role error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    if (error instanceof Error) {
      console.error('Database error:', error.message)
      return NextResponse.json(
        { error: 'Database operation failed', details: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error?.toString() },
      { status: 500 }
    )
  }
}
