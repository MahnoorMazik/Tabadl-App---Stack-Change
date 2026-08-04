import { NextRequest } from 'next/server'
import { WizardApplicationStatus } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getRequestId,
  logError,
} from '@/lib/error-handler'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'
import { zodErrorResponse } from '@/lib/forms/api-helpers'
// ✅ FIXED IMPORT PATH
import { sendApplicationStatusEmail } from '@/lib/email/application-email-service'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

const statusUpdateSchema = z.object({
  status: z.enum([
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

/** PATCH /api/admin/wizard-applications/[id]/status */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHENTICATION_ERROR,
          authResult.error || 'Authentication required',
          authResult.status || 401,
          { requestId }
        )
      )
    }

    if (authResult.user.role !== 'ADMIN') {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, 'Admin access required', 403, {
          requestId,
        })
      )
    }

    const body = await request.json()
    const parsed = statusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error, requestId)
    }

    const { status, adminNotes, sendEmail } = parsed.data

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
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    const oldStatus = currentApp.status
    const isStatusChanging = status !== oldStatus

    const updatedApp = await db.wizardApplication.update({
      where: { id },
      data: {
        status: status as WizardApplicationStatus,
        ...(adminNotes !== undefined && { adminNotes }),
        updatedAt: new Date(),
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

    let emailResult = { success: false, error: 'No email sent' }
    
    if (isStatusChanging && sendEmail !== false && updatedApp.client?.email) {
      try {
       
        let emailStatus: string = status;
        if (status === 'PENDING') {
          emailStatus = 'SUBMITTED';
        }
        
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
        
        console.log(`✅ Email sent to client for status: ${status}`)
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError)
        emailResult = {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        }
      }
    }

    return addCorsHeaders(
      createSuccessResponse(
        { 
          application: updatedApp,
          emailSent: emailResult.success,
          emailError: emailResult.error,
        },
        200,
        { 
          requestId, 
          message: `Status updated to ${status}. ${emailResult.success ? 'Email sent to client.' : 'Email failed to send.'}`
        }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: `PATCH /api/admin/wizard-applications/${id}/status`,
      method: 'PATCH',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update application status', 500, {
        requestId,
      })
    )
  }
}