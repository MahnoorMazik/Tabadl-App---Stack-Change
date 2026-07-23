import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'

// Get current user profile
export const GET = withAuth(async (request) => {
  const authUser = request.user!

  try {
    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        staffType: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    )
  }
})

// Update current user profile (basic fields only)
export const PUT = withAuth(async (request) => {
  const authUser = request.user!

  try {
    const body = await request.json()
    const { name, email, phone } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check email uniqueness if changed
    const existing = await db.user.findFirst({
      where: {
        email,
        isDeleted: false,
        NOT: { id: authUser.userId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email already in use by another user' },
        { status: 409 }
      )
    }

    const updated = await db.user.update({
      where: { id: authUser.userId },
      data: {
        name,
        email,
        phone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        staffType: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
})


