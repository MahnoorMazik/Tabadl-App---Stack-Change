import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withPermission } from '@/lib/rbac-middleware'
import { Module, Action } from '@/lib/rbac'
import { InvoiceStatus } from '@prisma/client'

// GET /api/analytics/revenue - Get revenue analytics
export const GET = withAuth(async (request) => {
  const user = request.user!

  if (!user.permissions?.includes(`${Module.FINANCIAL}.${Action.MANAGE}`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

    // Total Revenue (Paid Invoices)
    const totalRevenue = await db.invoice.aggregate({
      where: {
        status: InvoiceStatus.PAID,
        ...dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    })

    // Pending Revenue (Sent & Overdue Invoices)
    const pendingRevenue = await db.invoice.aggregate({
      where: {
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
        ...dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    })

    // Revenue by Month
    const invoices = await db.invoice.findMany({
      where: {
        status: InvoiceStatus.PAID,
        ...dateFilter,
      },
      select: {
        amount: true,
        paidAt: true,
      },
    })

    const revenueByMonth = invoices.reduce((acc: any, invoice) => {
      if (!invoice.paidAt) return acc
      
      const month = invoice.paidAt.toISOString().substring(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, total: 0, count: 0 }
      }
      acc[month].total += invoice.amount || 0
      acc[month].count += 1
      return acc
    }, {})

    // Total Expenses
    const totalExpenses = await db.expense.aggregate({
      where: {
        approvedById: { not: null },
        ...dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    })

    // Expenses by Category
    const expensesByCategory = await db.expense.groupBy({
      by: ['category'],
      where: {
        approvedById: { not: null },
        ...dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    })

    // Net Profit
    const netProfit = (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0)

    const analytics = {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalRevenueCount: totalRevenue._count,
      pendingRevenue: pendingRevenue._sum.amount || 0,
      pendingRevenueCount: pendingRevenue._count,
      totalExpenses: totalExpenses._sum.amount || 0,
      totalExpensesCount: totalExpenses._count,
      netProfit,
      revenueByMonth: Object.values(revenueByMonth),
      expensesByCategory,
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue analytics' }, { status: 500 })
  }
})

