import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAdmin } from '@/lib/rbac-middleware'

// Get users assigned to a specific role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roleId } = await params
  return withAdmin(async (request: NextRequest) => {
    try {
      // Check if role exists
      const role = await db.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        return NextResponse.json(
          { error: 'Role not found' },
          { status: 404 }
        )
      }

      // Get users assigned to this role
      const users = await db.user.findMany({
        where: {
          customRoleId: roleId
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          staffType: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true
        },
        orderBy: { name: 'asc' }
      })

      return NextResponse.json({ users })
    } catch (error) {
      console.error('Get role users error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(request)
}
