import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { getUserPermissions } from '@/lib/rbac-middleware'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user with all relations
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        customRole: true
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      )
    }

    // Get permissions
    const permissions = await getUserPermissions({
      role: user.role,
      staffType: user.staffType,
      customRoleId: user.customRoleId,
      customRole: user.customRole
    })

    // Return user data
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        staffType: user.staffType || undefined,
        name: user.name || '',
        tokenVersion: user.tokenVersion || 0,
        permissions,
        clientProfile: user.clientProfile ? {
          id: user.clientProfile.id,
          clientNumber: user.clientProfile.clientNumber,
          company: user.clientProfile.company
        } : null
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
