import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withPermission, requireAuth } from '@/lib/rbac-middleware'
import { Module, Action, canManageLeads } from '@/lib/rbac'
import { normalizePhone } from '@/lib/phone-normalization'
import { addSoftDeleteFilter } from '@/lib/soft-delete'
import { z } from 'zod'

const leadSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  companyName: z.string().optional(),
  companyType: z.string().optional(),
  natureOfBusiness: z.string().optional(),
  designation: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  howDidYouHear: z.string().optional(),
  businessTypes: z.string().optional(), // JSON string
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
})

// GET /api/leads - Get all leads (with filtering and pagination)
export const GET = withAuth(async (request) => {
  const user = request.user!
  const { searchParams } = new URL(request.url)
  
  const statusParam = searchParams.get('status') // status name from LeadStatus model
  const excludeConverted = searchParams.get('excludeConverted') === 'true'
  const assignedToId = searchParams.get('assignedToId')
  const search = searchParams.get('search')
  
  // Pagination parameters
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limitParam = searchParams.get('limit')
  const limit = limitParam === 'all' ? undefined : parseInt(limitParam || '25', 10)

  try {
    const where: any = {}

    // Handle status filter by custom lead status name
    if (statusParam && statusParam !== 'all') {
      where.status = { is: { name: statusParam } }
    } else if (excludeConverted) {
      // Exclude converted leads (those linked to a client)
      where.clientId = null
    }
    
    if (assignedToId) where.assignedToId = assignedToId
    if (search) {
      // Sanitize search input
      const sanitizedSearch = search.replace(/['"\\]/g, '')
      where.OR = [
        { fullName: { contains: sanitizedSearch } },
        { email: { contains: sanitizedSearch } },
        { companyName: { contains: sanitizedSearch } },
      ]
    }

    // Get total count for pagination (only non-deleted leads)
    const activeWhere = addSoftDeleteFilter(where)
    const total = await db.lead.count({ where: activeWhere })

    // Calculate pagination
    const totalPages = limit ? Math.ceil(total / limit) : 1
    const skip = limit ? (page - 1) * limit : undefined
    const take = limit || undefined

    const rawLeads = await db.lead.findMany({
      where: activeWhere,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    })

    // Map relation-based status back to a simple string for existing frontend code
    const leads = rawLeads.map((lead: any) => ({
      ...lead,
      status: lead.status?.name ?? null,
    }))

    // Fetch stats (counts by status) for real-time dashboard cards - always use full DB counts
    const baseWhere = addSoftDeleteFilter({})
    const allStatuses = await db.leadStatus.findMany({ select: { id: true, name: true } })
    const stats: Record<string, number> = { total: 0, new: 0, contacted: 0, qualified: 0, converted: 0 }
    for (const s of allStatuses) {
      const count = await db.lead.count({
        where: { ...baseWhere, statusId: s.id },
      })
      const nameLower = s.name.toLowerCase()
      if (nameLower === 'new') stats.new = count
      else if (nameLower === 'contacted') stats.contacted = count
      else if (nameLower === 'qualified') stats.qualified = count
      else if (nameLower === 'converted') stats.converted = count
      stats.total += count
    }

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit: limit || total,
        total,
        totalPages,
        hasNextPage: limit ? page < totalPages : false,
        hasPreviousPage: limit ? page > 1 : false,
      },
      stats,
    })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
    // Return detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || 'Failed to fetch leads'
      : 'Failed to fetch leads'
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
})

// POST /api/leads - Create a new lead
export const POST = withAuth(async (request) => {
  const user = request.user!

  if (!canManageLeads(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = leadSchema.parse(body)

    // Generate lead number (check ALL leads including deleted ones)
    // leadNumber has @unique constraint, so we need to check ALL leads
    const existingLeads = await db.lead.findMany({
      select: { leadNumber: true }
    })
    
    // Extract all numbers and find the maximum
    let maxNumber = 0
    for (const lead of existingLeads) {
      if (lead.leadNumber) {
        const match = lead.leadNumber.match(/LD-(\d+)/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
    }
    
    const leadNumber = `LD-${maxNumber + 1}`

    // Normalize phone number if provided
    const normalizedPhoneValue = data.phone ? normalizePhone(data.phone) : null

    // Determine default status (prefer "New", otherwise first OPEN type if exists)
    const defaultStatus =
      (await db.leadStatus.findFirst({ where: { name: 'New' } })) ||
      (await db.leadStatus.findFirst({
        where: { type: 'OPEN' },
        orderBy: { createdAt: 'asc' },
      }))

    // Auto-assign to creator when no assignee is provided; otherwise use provided assignedToId
    const assignedToId = (data.assignedToId && String(data.assignedToId).trim()) ? data.assignedToId : user.userId

    const lead = await db.lead.create({
      data: {
        leadNumber,
        ...data,
        phone: data.phone, // Store original phone
        normalizedPhone: normalizedPhoneValue, // Store normalized phone
        createdById: user.userId, // Track who created the lead
        assignedToId, // Creator by default; send push only when assigned to someone else
        ...(defaultStatus && { statusId: defaultStatus.id }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Send notification via global event settings
    if (lead.assignedToId) {
      try {
        const { dispatchEvent } = await import('@/lib/notifications/service')
        await dispatchEvent({
          eventType: 'LEAD_CREATION',
          title: 'New Lead',
          message: `Lead created: ${lead.fullName} (${lead.leadNumber})`,
          entityType: 'Lead',
          entityId: lead.id,
          assignedUserId: lead.assignedToId,
          url: '/admin/leads',
        })
      } catch (notifError) {
        console.error('[Notification] Failed to send lead created notification:', notifError)
      }
    }

    const { logCreateActivity } = await import('@/lib/activity-tracking')
    await logCreateActivity(
      { userId: user.userId },
      'Lead',
      lead.id,
      lead.fullName,
      { email: lead.email, leadNumber: lead.leadNumber },
      request
    )

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.issues 
      }, { status: 400 })
    }
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
})

