import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { TaskStatus, UserRole, TaskPriority } from '@prisma/client'
import { notifyTaskAssignment } from '@/lib/notifications'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  applicationId: z.string(),
  assignedToId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().optional(),
})

// GET /api/tasks - Get all tasks (with filtering)
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status') as TaskStatus | null
  const applicationId = searchParams.get('applicationId')
  const assignedToId = searchParams.get('assignedToId')

  try {
    const where: any = {
      isDeleted: false, // Filter out soft-deleted tasks
    }

    if (status) where.status = status
    if (applicationId) where.applicationId = applicationId
    if (assignedToId) where.assignedToId = assignedToId

    // If client, filter by their applications
    if (user.role === UserRole.CLIENT) {
      const client = await db.client.findUnique({
        where: { userId: user.userId },
        include: { applications: { select: { id: true } } }
      })
      
      if (client) {
        where.applicationId = { in: client.applications.map(a => a.id) }
      } else {
        return addCorsHeaders(createSuccessResponse(
          { tasks: [] },
          200,
          { requestId, message: 'No tasks found' }
        ))
      }
    }

    const tasks = await db.task.findMany({
      where,
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
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Mark overdue tasks (but don't update in database on every GET)
    // Note: Overdue status updates should be done by a background job/cron
    const now = new Date()
    const tasksWithOverdue = tasks.map(task => {
      if (task.dueDate && 
          task.dueDate < now && 
          task.status !== TaskStatus.COMPLETED && 
          task.status !== TaskStatus.CANCELLED &&
          task.status !== TaskStatus.OVERDUE) {
        // Only mark as overdue in response, don't persist
        return { ...task, isOverdue: true }
      }
      return task
    })

    return addCorsHeaders(createSuccessResponse(
      { tasks: tasksWithOverdue },
      200,
      { requestId, message: 'Tasks retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/tasks',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch tasks.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/tasks - Create a new task
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  if (user.role !== UserRole.STAFF) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHORIZATION_ERROR,
      'Staff role required to create tasks.',
      403,
      { requestId }
    ))
  }

  try {
    const body = await request.json()
    const data = taskSchema.parse(body)

    const taskData: any = {
      title: data.title,
      description: data.description,
      applicationId: data.applicationId,
      priority: data.priority || TaskPriority.MEDIUM,
    }

    if (data.assignedToId) taskData.assignedToId = data.assignedToId
    if (data.dueDate) taskData.dueDate = new Date(data.dueDate)

    const task = await db.task.create({
      data: taskData,
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

    // Notify assigned user
    if (data.assignedToId) {
      await notifyTaskAssignment(task.id, data.assignedToId, task.title)
    }

    return addCorsHeaders(createSuccessResponse(
      { task },
      201,
      { requestId, message: 'Task created successfully' }
    ))
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const details = error.issues?.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })) || []
      
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed.',
        400,
        { requestId, details, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/tasks',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create task.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

