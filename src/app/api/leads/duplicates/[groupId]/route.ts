import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { auth } from '@/lib/auth/config'

// GET /api/leads/duplicates/[groupId] - Get specific duplicate group details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const authResult = await requireAuth(request)
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { groupId } = await params
  
  try {
    // Get all leads in this duplicate group
    const leads = await db.lead.findMany({
      where: {
        OR: [
          { duplicateGroupId: groupId },
          { id: groupId } // Include the original lead
        ]
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }
    })

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'Duplicate group not found' },
        { status: 404 }
      )
    }

    // Find differences between leads
    const originalLead = leads[0]
    const differences = leads.slice(1).map(lead => {
      const diff: Record<string, { original: any; duplicate: any }> = {}
      
      // Compare key fields
      const fieldsToCompare = [
        'fullName', 'phone', 'companyName', 'companyType', 
        'natureOfBusiness', 'designation', 'country', 'city', 
        'howDidYouHear', 'businessTypes'
      ]

      fieldsToCompare.forEach(field => {
        const originalValue = originalLead[field as keyof typeof originalLead]
        const duplicateValue = lead[field as keyof typeof lead]
        
        if (originalValue !== duplicateValue) {
          diff[field] = {
            original: originalValue,
            duplicate: duplicateValue
          }
        }
      })

      return {
        leadId: lead.id,
        createdAt: lead.createdAt,
        differences: diff
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        groupId,
        email: originalLead.email,
        totalCount: leads.length,
        leads,
        differences
      }
    })
  } catch (error: any) {
    console.error('Error fetching duplicate group details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch duplicate group details' },
      { status: 500 }
    )
  }
}
