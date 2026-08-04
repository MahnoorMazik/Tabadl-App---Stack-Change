import { NextRequest, NextResponse } from 'next/server'
import { WizardApplicationStatus } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getToken } from 'next-auth/jwt'
import { sendApplicationStatusEmail } from '@/lib/email/application-email-service'

const statusUpdateSchema = z.object({
  status: z.enum([
    'DRAFT',
    'PENDING',
    'IN_PROGRESS',
    'HARD_COPY_REQUIRED',
    'APPROVED',
    'REJECTED',
    'COMPLETED'
  ]),
  adminNotes: z.string().nullable().optional(),
  sendEmail: z.boolean().optional().default(true),
})

/**
 * PATCH /api/admin/wizard-applications/[id]/status
 * 
 * Updates the status of a wizard application. Only ADMIN and STAFF users can perform this action.
 * Sends an email notification to the client when the status changes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await params before using (Next.js 15 requirement)
    const { id } = await params
    console.log('🔵 Admin status update request for ID:', id)

    // ✅ Get token using NextAuth JWT
    const token = await getToken({ 
      req: request,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
    })
    console.log('🔵 Token email:', token?.email)
    console.log('🔵 Token role:', token?.role)

    // ✅ Check if user is authenticated
    if (!token) {
      console.log('🔴 No token found')
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      )
    }

    // ✅ Check if user has permission (ADMIN or STAFF)
    const userRole = token.role as string
    console.log('🔵 User role from token:', userRole)

    // ✅ Allow both ADMIN and STAFF to update status
    const allowedRoles = ['ADMIN', 'STAFF']
    if (!allowedRoles.includes(userRole)) {
      console.log(`🔴 User does not have permission. Role: ${userRole}`)
      return NextResponse.json(
        { 
          error: `Access denied. Required roles: ${allowedRoles.join(' or ')}. Your role: ${userRole}`,
          role: userRole,
          requiredRoles: allowedRoles
        },
        { status: 403 }
      )
    }

    console.log(`✅ Authorized user: ${token.email} (${userRole})`)

    // Parse request body
    const body = await request.json()
    console.log('📦 Request body:', body)

    const parsed = statusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      console.log('🔴 Validation failed:', parsed.error.issues)
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: parsed.error.issues 
        },
        { status: 400 }
      )
    }

    const { status, adminNotes, sendEmail } = parsed.data

    // Get current application with client info
    const currentApp = await db.wizardApplication.findFirst({
      where: { id, isDeleted: false },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    })

    if (!currentApp) {
      console.log('🔴 Application not found:', id)
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    console.log('🟢 Current app status:', currentApp.status)

    const oldStatus = currentApp.status
    const isStatusChanging = status !== oldStatus

    // Update application status
    const updatedApp = await db.wizardApplication.update({
      where: { id },
      data: {
        status: status as WizardApplicationStatus,
        ...(adminNotes !== undefined && { adminNotes }),
        updatedAt: new Date(),
        assignedToId: token.id as string,
      },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    })

    console.log('🟢 Updated app status:', updatedApp.status)

    // ✅ SEND EMAIL IF STATUS CHANGED
    let emailResult = { success: false, error: 'No email sent' }
    
    if (isStatusChanging && sendEmail !== false && updatedApp.client?.email) {
      try {
        // Map status to email type
        let emailStatus: string = status;
        if (status === 'PENDING') {
          emailStatus = 'SUBMITTED';
        }
        
        console.log('📧 Sending email with status:', emailStatus)
        console.log('📧 Recipient:', updatedApp.client.email)
        
        const result = await sendApplicationStatusEmail({
          applicationId: updatedApp.id,
          applicationNumber: updatedApp.applicationNumber,
          status: emailStatus,
          recipientEmail: updatedApp.client.email,
          serviceName: updatedApp.areaOfInterest,
          adminNotes: adminNotes || undefined,
        })
        
        emailResult = {
          success: result.success,
          error: result.error || 'Unknown error',
        }
        
        console.log(`✅ Email result:`, emailResult)
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError)
        emailResult = {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        application: updatedApp,
        emailSent: emailResult.success,
        emailError: emailResult.error,
      },
      message: `Status updated to ${status}. ${emailResult.success ? 'Email sent to client.' : 'Email failed to send.'}`
    })

  } catch (error: unknown) {
    console.error('❌ Error in status update:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update application status' 
      },
      { status: 500 }
    )
  }
}