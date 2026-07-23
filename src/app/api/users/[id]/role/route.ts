import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAdminParams } from '@/lib/rbac-middleware'

// Assign role to user
export const PUT = withAdminParams(async (req, { params }) => {
  try {
    const { id } = await params
    const body = await req.json()
    const { roleId } = body

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if role exists (if roleId is provided)
    if (roleId) {
      const role = await db.role.findUnique({
        where: { id: roleId }
      })

      if (!role || !role.isActive) {
        return NextResponse.json(
          { error: 'Role not found or inactive' },
          { status: 404 }
        )
      }
    }

    // Update user's role
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        customRoleId: roleId || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffType: true,
        customRole: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Assign role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// Remove role from user
export const DELETE = withAdminParams(async (req, { params }) => {
  try {
    const { id } = await params
    // Check if user exists
    const user = await db.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove custom role (user will fall back to default role based on staff type)
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        customRoleId: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffType: true,
        customRole: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Remove role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
