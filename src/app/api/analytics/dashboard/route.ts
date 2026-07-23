import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { UserRole, StaffType, ApplicationStatus, TaskStatus, InvoiceStatus } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/analytics/dashboard - Get dashboard analytics
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    let analytics: any = {}

    if (user.role === UserRole.CLIENT) {
      // Client Dashboard
      const client = await db.client.findUnique({
        where: { userId: user.userId },
        include: {
          applications: {
            include: {
              tasks: true,
              documents: true,
            },
          },
        },
      })

      if (!client) {
        // Return default values instead of empty object
        analytics = {
          totalApplications: 0,
          activeApplications: 0,
          completedApplications: 0,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          totalInvoiceAmount: 0,
          recentApplications: []
        }
        return addCorsHeaders(createSuccessResponse(
          { analytics },
          200,
          { requestId, message: 'Analytics retrieved successfully' }
        ))
      }

      // Get invoices separately for the client (only non-deleted)
      const clientInvoices = await db.invoice.findMany({
        where: { clientId: client.id, isDeleted: false },
      })

      const totalApplications = client.applications.length
      const activeApplications = client.applications.filter(a => a.status !== ApplicationStatus.COMPLETED).length
      const totalTasks = client.applications.reduce((sum, a) => sum + a.tasks.length, 0)
      const completedTasks = client.applications.reduce(
        (sum, a) => sum + a.tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        0
      )
      
      // Calculate invoice stats from clientInvoices (fetched separately)
      const totalInvoices = clientInvoices.length
      const paidInvoices = clientInvoices.filter(i => i.status === InvoiceStatus.PAID).length
      const totalInvoiceAmount = clientInvoices.reduce((sum, i) => sum + i.amount, 0)

      analytics = {
        totalApplications,
        activeApplications,
        completedApplications: totalApplications - activeApplications,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        totalInvoices,
        paidInvoices,
        pendingInvoices: totalInvoices - paidInvoices,
        totalInvoiceAmount,
        recentApplications: client.applications.slice(0, 5),
      }
    } else if (user.role === UserRole.STAFF) {
      // Staff Dashboard
      const isAdmin = user.staffType === StaffType.ADMIN

      if (isAdmin) {
        // Admin sees everything
        const [
          totalLeads,
          totalClients,
          totalApplications,
          totalTasks,
          totalInvoices,
          recentLeads,
          recentApplications,
          leadStatusWithCounts,
        ] = await Promise.all([
          // Count all leads (converted or not, but not deleted)
          db.lead.count({
            where: { isDeleted: false }
          }),
          // Count all clients (not deleted)
          db.client.count({
            where: { isDeleted: false }
          }),
          db.application.count(),
          db.task.count(),
          db.invoice.count(),
          db.lead.findMany({
            take: 5,
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            include: {
              assignedTo: {
                select: { id: true, name: true },
              },
              status: true,
            },
          }),
          db.application.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              client: {
                include: {
                  user: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          }),
          db.leadStatus.findMany({
            include: {
              _count: {
                select: { leads: true },
              },
            },
          }),
        ])

        // Application status breakdown
        const applicationsByStatus = await db.application.groupBy({
          by: ['status'],
          _count: true,
        })

        // Revenue data
        const totalRevenue = await db.invoice.aggregate({
          where: { status: InvoiceStatus.PAID },
          _sum: { amount: true },
        })

        const pendingRevenue = await db.invoice.aggregate({
          where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] } },
          _sum: { amount: true },
        })

        // Calculate performance metrics
        const conversionRate = totalLeads > 0 ? (totalClients / totalLeads) * 100 : 0
        const averageRevenuePerClient = totalClients > 0 ? (totalRevenue._sum.amount || 0) / totalClients : 0
        const taskCompletionRate = totalTasks > 0 ? 
          (await db.task.count({ where: { status: 'COMPLETED' } }) / totalTasks) * 100 : 0
        
        // Calculate monthly growth (comparing current month to previous month)
        const currentMonth = new Date()
        const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        
        const [currentMonthClients, previousMonthClients, currentMonthLeads, currentMonthRevenue, previousMonthRevenue] = await Promise.all([
          db.client.count({
            where: {
              isDeleted: false,
              createdAt: {
                gte: currentMonthStart,
                lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
              }
            }
          }),
          db.client.count({
            where: {
              isDeleted: false,
              createdAt: {
                gte: previousMonth,
                lt: currentMonthStart
              }
            }
          }),
          // Count new leads this month
          db.lead.count({
            where: {
              isDeleted: false,
              createdAt: {
                gte: currentMonthStart,
                lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
              }
            }
          }),
          db.invoice.aggregate({
            where: {
              status: InvoiceStatus.PAID,
              createdAt: {
                gte: currentMonthStart,
                lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
              }
            },
            _sum: { amount: true }
          }),
          db.invoice.aggregate({
            where: {
              status: InvoiceStatus.PAID,
              createdAt: {
                gte: previousMonth,
                lt: currentMonthStart
              }
            },
            _sum: { amount: true }
          })
        ])

        const clientGrowthRate = previousMonthClients > 0 ? 
          ((currentMonthClients - previousMonthClients) / previousMonthClients) * 100 : 
          currentMonthClients > 0 ? 100 : 0

        const revenueGrowthRate = (previousMonthRevenue._sum.amount || 0) > 0 ? 
          (((currentMonthRevenue._sum.amount || 0) - (previousMonthRevenue._sum.amount || 0)) / (previousMonthRevenue._sum.amount || 0)) * 100 : 
          (currentMonthRevenue._sum.amount || 0) > 0 ? 100 : 0

        // Calculate average case completion time
        const completedApplications = await db.application.findMany({
          where: { status: ApplicationStatus.COMPLETED },
          select: { createdAt: true, updatedAt: true }
        })
        
        const averageApplicationCompletionDays = completedApplications.length > 0 ? 
          completedApplications.reduce((sum, application) => {
            if (application.createdAt && application.updatedAt) {
              const diffTime = application.updatedAt.getTime() - application.createdAt.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              return sum + diffDays
            }
            return sum
          }, 0) / completedApplications.length : 0

        // Generate historical data for charts (last 6 months)
        const chartData: Array<{ month: string; clients: number; leads: number; revenue: number }> = []
        for (let i = 5; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
          
          const [monthClients, monthLeads, monthRevenue] = await Promise.all([
            db.client.count({
              where: {
                isDeleted: false,
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              }
            }),
            db.lead.count({
              where: {
                isDeleted: false,
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              }
            }),
            db.invoice.aggregate({
              where: {
                status: InvoiceStatus.PAID,
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              },
              _sum: { amount: true }
            })
          ])

          chartData.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            clients: monthClients,
            leads: monthLeads,
            revenue: monthRevenue._sum.amount || 0
          })
        }

        analytics = {
          totalLeads,
          totalClients,
          totalApplications,
          totalTasks,
          totalInvoices,
          leadsByStatus: leadStatusWithCounts.map((s) => ({
            statusId: s.id,
            name: s.name,
            type: s.type,
            count: s._count.leads,
          })),
          applicationsByStatus,
          totalRevenue: totalRevenue._sum.amount || 0,
          pendingRevenue: pendingRevenue._sum.amount || 0,
          recentLeads,
          recentApplications,
          // Performance metrics
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageRevenuePerClient: Math.round(averageRevenuePerClient * 100) / 100,
          taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
          clientGrowthRate: Math.round(clientGrowthRate * 100) / 100,
          revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
          averageApplicationCompletionDays: Math.round(averageApplicationCompletionDays * 100) / 100,
          currentMonthClients,
          currentMonthRevenue: currentMonthRevenue._sum.amount || 0,
          // New counts for this month
          newClients: currentMonthClients,
          newLeads: currentMonthLeads,
          // Chart data
          chartData
        }
      } else {
        // Non-admin staff sees global data (same as sidebar stats)
        const [
          totalLeads,
          totalClients,
          totalApplications,
          totalTasks,
          totalInvoices,
          pendingApplications,
          totalRevenue,
          pendingRevenue,
        ] = await Promise.all([
          // Count all leads (converted or not, but not deleted)
          db.lead.count({
            where: { isDeleted: false }
          }),
          // Count all clients (not deleted)
          db.client.count({
            where: { isDeleted: false }
          }),
          db.application.count(),
          db.task.count(),
          db.invoice.count(),
          db.application.count({
            where: { status: ApplicationStatus.PENDING }
          }),
          db.invoice.aggregate({
            where: { status: InvoiceStatus.PAID },
            _sum: { amount: true },
          }),
          db.invoice.aggregate({
            where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] } },
            _sum: { amount: true },
          }),
        ])

        // Generate chart data for all staff users
        const chartData: Array<{ month: string; clients: number; leads: number; revenue: number }> = []
        for (let i = 5; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
          
          const [monthClients, monthLeads, monthRevenue] = await Promise.all([
            db.client.count({
              where: {
                isDeleted: false,
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              }
            }),
            db.lead.count({
              where: {
                isDeleted: false,
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              }
            }),
            db.invoice.aggregate({
              where: {
                status: InvoiceStatus.PAID,
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd
                }
              },
              _sum: { amount: true }
            })
          ])

          chartData.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            clients: monthClients,
            leads: monthLeads,
            revenue: monthRevenue._sum.amount || 0
          })
        }

        // Calculate new clients and leads for this month (non-admin staff)
        const currentMonth = new Date()
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const [currentMonthClients, currentMonthLeads] = await Promise.all([
          db.client.count({
            where: {
              isDeleted: false,
              createdAt: {
                gte: currentMonthStart,
                lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
              }
            }
          }),
          db.lead.count({
            where: {
              isDeleted: false,
              createdAt: {
                gte: currentMonthStart,
                lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
              }
            }
          })
        ])

        analytics = {
          totalLeads,
          totalClients,
          totalApplications,
          totalTasks,
          totalInvoices,
          pendingApplications,
          totalRevenue: totalRevenue._sum.amount || 0,
          pendingRevenue: pendingRevenue._sum.amount || 0,
          // New counts for this month
          newClients: currentMonthClients,
          newLeads: currentMonthLeads,
          activeClients: totalClients,
          approvedApplications: totalApplications - pendingApplications,
          totalDocuments: 0, // Could be calculated
          pendingDocuments: 0, // Could be calculated
          approvedDocuments: 0, // Could be calculated
          totalPayments: 0, // Could be calculated
          pendingPayments: 0, // Could be calculated
          totalExpenses: 0, // Could be calculated
          pendingExpenses: 0, // Could be calculated
          // Chart data for all staff
          chartData
        }
      }
    }

    // Ensure analytics always has default values (never empty object)
    if (!analytics || typeof analytics !== 'object' || Object.keys(analytics).length === 0) {
      console.log('⚠️ Analytics is empty, returning default values')
      // Return default analytics structure based on user role
      if (user.role === UserRole.CLIENT) {
        analytics = {
          totalApplications: 0,
          activeApplications: 0,
          completedApplications: 0,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          totalInvoiceAmount: 0,
          recentApplications: []
        }
      } else {
        // Staff/Admin default values
        analytics = {
          totalLeads: 0,
          totalClients: 0,
          totalApplications: 0,
          totalTasks: 0,
          totalInvoices: 0,
          newClients: 0,
          newLeads: 0,
          totalRevenue: 0,
          pendingRevenue: 0,
          conversionRate: 0,
          clientGrowthRate: 0,
          revenueGrowthRate: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          activeClients: 0,
          chartData: []
        }
      }
    }

    console.log('📊 Analytics data being returned:', analytics)
    console.log('📊 Chart data:', analytics.chartData)
    return addCorsHeaders(createSuccessResponse(
      { analytics },
      200,
      { requestId, message: 'Analytics retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/analytics/dashboard',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    // Return default analytics instead of error so dashboard still displays
    const defaultAnalytics = user.role === UserRole.CLIENT ? {
      totalApplications: 0,
      activeApplications: 0,
      completedApplications: 0,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      totalInvoiceAmount: 0,
      recentApplications: []
    } : {
      totalLeads: 0,
      totalClients: 0,
      totalApplications: 0,
      totalTasks: 0,
      totalInvoices: 0,
      newClients: 0,
      newLeads: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      conversionRate: 0,
      clientGrowthRate: 0,
      revenueGrowthRate: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      activeClients: 0,
      chartData: []
    }

    return addCorsHeaders(createSuccessResponse(
      { analytics: defaultAnalytics },
      200,
      { requestId, message: 'Analytics retrieved with default values due to error' }
    ))
  }
})

