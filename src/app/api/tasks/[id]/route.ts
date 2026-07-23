import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, requireAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { TaskStatus, UserRole } from '@prisma/client'

const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().optional(),
})

// GET /api/tasks/[id] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  try {
    const task = await db.task.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult
  const { id } = await params

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateTaskSchema.parse(body)

    const updateData: any = {}
    
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.assignedToId) updateData.assignedToId = data.assignedToId
    if (data.status) {
      updateData.status = data.status
      if (data.status === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date()
      }
    }
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate)

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        application: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult
  const { id } = await params

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Soft delete task (mark as deleted, keep ID and data)
    await db.task.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}

