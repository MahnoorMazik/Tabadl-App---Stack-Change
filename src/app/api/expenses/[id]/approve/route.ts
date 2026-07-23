import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withPermission, requireAdmin } from '@/lib/rbac-middleware'


// POST /api/expenses/[id]/approve - Approve an expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult
  const { id } = await params

  try {
    const expense = await db.expense.update({
      where: { id },
      data: {
        approvedById: user.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Error approving expense:', error)
    return NextResponse.json({ error: 'Failed to approve expense' }, { status: 500 })
  }
}

