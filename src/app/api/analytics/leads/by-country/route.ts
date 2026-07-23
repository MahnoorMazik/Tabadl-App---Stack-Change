import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/analytics/leads/by-country - Get leads grouped by country
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const { searchParams } = new URL(request.url)

  try {
    // Parse query parameters
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const statusParam = searchParams.get('status') // status name (optional)
    const limitParam = searchParams.get('limit')

    // Build where clause
    const where: any = {
      country: { not: null }, // Exclude null countries
      isDeleted: false, // Filter out soft-deleted leads
    }

    // Add date range filter
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam)
      const endDate = new Date(endDateParam)
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999)
      where.createdAt = {
        gte: startDate,
        lte: endDate
      }
    } else if (startDateParam) {
      where.createdAt = {
        gte: new Date(startDateParam)
      }
    } else if (endDateParam) {
      const endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
      where.createdAt = {
        lte: endDate
      }
    }

    // Add status filter by custom lead status name
    if (statusParam && statusParam !== 'all') {
      where.status = {
        is: {
          name: statusParam
        }
      }
    }

    // Get total count for percentage calculation
    const total = await db.lead.count({ where })

    if (total === 0) {
      return addCorsHeaders(createSuccessResponse(
        {
          countries: [],
          total: 0,
          dateRange: {
            startDate: startDateParam || null,
            endDate: endDateParam || null
          },
          summary: {
            totalCountries: 0,
            countriesWithLeads: 0,
            topCountry: null
          }
        },
        200,
        { requestId, message: 'No leads found for the specified criteria' }
      ))
    }

    // Group leads by country
    const countryStats = await db.lead.groupBy({
      by: ['country'],
      where,
      _count: {
        country: true
      },
      orderBy: {
        _count: {
          country: 'desc'
        }
      }
    })

    // Get status breakdown for each country (optional - can be expensive)
    const countriesWithBreakdown = await Promise.all(
      countryStats.map(async (stat) => {
        const statusBreakdown = await db.lead.groupBy({
          by: ['statusId'],
          where: {
            ...where,
            country: stat.country
          },
          _count: {
            statusId: true
          }
        })

        const breakdown: Record<string, number> = {}
        for (const item of statusBreakdown) {
          if (!item.statusId) return
          const status = await db.leadStatus.findUnique({ where: { id: item.statusId } })
          if (status) {
            breakdown[status.name] = item._count.statusId
          }
        }

        return {
          country: stat.country,
          count: stat._count.country,
          percentage: parseFloat(((stat._count.country / total) * 100).toFixed(2)),
          statusBreakdown: breakdown
        }
      })
    )

    // Apply limit if specified
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const countries = limit ? countriesWithBreakdown.slice(0, limit) : countriesWithBreakdown

    // Calculate summary
    const summary = {
      totalCountries: countryStats.length,
      countriesWithLeads: countries.length,
      topCountry: countries.length > 0 && countries[0] ? countries[0].country : null
    }

    return addCorsHeaders(createSuccessResponse(
      {
        countries,
        total,
        dateRange: {
          startDate: startDateParam || null,
          endDate: endDateParam || null
        },
        summary
      },
      200,
      { requestId, message: 'Leads by country analytics retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/analytics/leads/by-country',
      method: 'GET'
    })
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch leads by country analytics',
      500,
      {
        suggestion: getErrorSuggestion(ErrorCodes.INTERNAL_ERROR),
        requestId,
        context: { error: error.message }
      }
    ))
  }
})

