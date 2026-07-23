import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAdmin } from '@/lib/rbac-middleware'
import { TaskStatus, ApplicationStatus, LeadStatusType } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/analytics/performance - Get staff performance analytics
export const GET = withAdmin(async (request) => {

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    } : {}

    // Get all staff members
    const staff = await db.user.findMany({
      where: {
        role: 'STAFF',
      },
      select: {
        id: true,
        name: true,
        email: true,
        staffType: true,
      },
    })

    const performanceData = await Promise.all(
      staff.map(async (member) => {
        // Applications managed
        const applicationsManaged = await db.application.count({
          where: {
            assignedToId: member.id,
            ...dateFilter,
          },
        })

        const completedApplications = await db.application.count({
          where: {
            assignedToId: member.id,
            status: 'COMPLETED',
            ...dateFilter,
          },
        })

        // Tasks assigned
        const tasksAssigned = await db.task.count({
          where: {
            assignedToId: member.id,
            ...dateFilter,
          },
        })

        const completedTasks = await db.task.count({
          where: {
            assignedToId: member.id,
            status: TaskStatus.COMPLETED,
            ...dateFilter,
          },
        })

        const overdueTasks = await db.task.count({
          where: {
            assignedToId: member.id,
            status: TaskStatus.OVERDUE,
          },
        })

        // Leads managed (for sales staff)
        const leadsManaged = await db.lead.count({
          where: {
            assignedToId: member.id,
            ...dateFilter,
          },
        })

        const convertedLeads = await db.lead.count({
          where: {
            assignedToId: member.id,
            status: {
              type: LeadStatusType.WON,
            },
            ...dateFilter,
          },
        })

        return {
          staff: member,
          metrics: {
            applicationsManaged,
            completedApplications,
            applicationCompletionRate: applicationsManaged > 0 ? (completedApplications / applicationsManaged * 100).toFixed(2) : '0',
            tasksAssigned,
            completedTasks,
            overdueTasks,
            taskCompletionRate: tasksAssigned > 0 ? (completedTasks / tasksAssigned * 100).toFixed(2) : '0',
            leadsManaged,
            convertedLeads,
            leadConversionRate: leadsManaged > 0 ? (convertedLeads / leadsManaged * 100).toFixed(2) : '0',
          },
        }
      })
    )

    return addCorsHeaders(createSuccessResponse(
      { performanceData },
      200,
      { requestId: getRequestId(request), message: 'Performance analytics retrieved successfully' }
    ))
  } catch (error: any) {
    const requestId = getRequestId(request)
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/analytics/performance',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch performance analytics.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

