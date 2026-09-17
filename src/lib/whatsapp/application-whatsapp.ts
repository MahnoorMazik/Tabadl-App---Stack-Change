import { db } from "@/lib/db";
import { sendWhatsAppMessage } from "./whatsapp-client";
import { APPLICATION_WHATSAPP } from "./application-templates";

export interface ApplicationWhatsAppPayload {
  applicationId?: string;
  applicationNumber?: string;
  status?: string;
  recipientPhone?: string;
  serviceName?: string;
  adminNotes?: string;
}

export async function sendApplicationStatusWhatsApp(
  payload: ApplicationWhatsAppPayload
): Promise<{ success: boolean; skipped?: boolean; error?: string; messageId?: string }> {
  try {
    // 🔥 Check WhatsApp config from database
    const settings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        enableWhatsAppNotifications: true,
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
      }
    })

    // Check if WhatsApp is enabled in database
    if (!settings?.enableWhatsAppNotifications) {
      return {
        success: false,
        skipped: true,
        error: 'Client WhatsApp notifications are disabled in Settings. Enable in Admin → Email Settings → WhatsApp Configuration.',
      }
    }

    // Check if credentials are configured
    if (!settings.whatsappAccessToken || !settings.whatsappPhoneNumberId) {
      return {
        success: false,
        skipped: true,
        error: 'WhatsApp API credentials are not configured. Setup in Admin → Email Settings → WhatsApp Configuration.',
      }
    }

    // Build where clause for finding the application
    const where = payload.applicationId
      ? { id: payload.applicationId }
      : payload.applicationNumber
      ? { applicationNumber: payload.applicationNumber }
      : undefined

    if (!where) {
      return {
        success: false,
        error: 'applicationId or applicationNumber is required',
      }
    }

    // Fetch application with client details
    const application = await db.wizardApplication.findUnique({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    })

    if (!application) {
      return {
        success: false,
        error: `Application not found: ${payload.applicationId ?? payload.applicationNumber}`,
      }
    }

    // Get recipient phone number
    const recipientPhone = payload.recipientPhone || application.client?.phone

    if (!recipientPhone) {
      return {
        success: false,
        error: 'No recipient phone number available for the application client',
      }
    }

    // Map status to template key
    const rawStatus = payload.status || application.status
    const statusKey = 
      rawStatus === 'PENDING' ? 'SUBMITTED' :
      rawStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' :
      rawStatus === 'UNDER_REVIEW' ? 'UNDER_REVIEW' :
      rawStatus === 'HARD_COPY_REQUIRED' ? 'HARD_COPY_REQUIRED' :
      rawStatus === 'APPROVED' ? 'APPROVED' :
      rawStatus === 'REJECTED' ? 'REJECTED' :
      rawStatus === 'COMPLETED' ? 'COMPLETED' :
      'SUBMITTED'

    // Get the template
    const template = APPLICATION_WHATSAPP[statusKey as keyof typeof APPLICATION_WHATSAPP]

    if (!template) {
      return {
        success: false,
        error: `Invalid status: ${rawStatus}`,
      }
    }

    // WhatsApp Cloud API expects digits only (country code + number, no + or spaces)
    const digitsOnly = recipientPhone.replace(/\D/g, '')
    const fullPhone = digitsOnly.replace(/^0+/, '')

    if (fullPhone.length < 10) {
      return {
        success: false,
        error: `Invalid phone number: ${recipientPhone}`,
      }
    }

    // Build the message content
    const messageContent = template.buildMessage({
      clientName: application.client?.name || undefined,
      applicationNumber: application.applicationNumber || application.id,
      status: rawStatus,
      serviceName: payload.serviceName || application.areaOfInterest || 'N/A',
      adminNotes: payload.adminNotes,
    })

    // Send WhatsApp message
    const result = await sendWhatsAppMessage({
      to: fullPhone,
      message: messageContent,
      type: statusKey,
    })

    if (!result.success) {
      console.error('Application WhatsApp notification failed:', result.error)
      return {
        success: false,
        error: result.error || 'Failed to send WhatsApp message',
      }
    }

    // Log success
    console.log(`✅ WhatsApp notification sent for application ${application.applicationNumber} to ${fullPhone}`)

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error("WHATSAPP ERROR:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message",
    }
  }
}

// Optional: Function to send WhatsApp notification with custom message
export async function sendCustomWhatsAppMessage(
  phoneNumber: string,
  message: string,
  metadata?: {
    applicationId?: string;
    applicationNumber?: string;
    type?: string;
  }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    if (!phoneNumber) {
      return {
        success: false,
        error: 'Phone number is required',
      }
    }

    // Format phone number
    const formattedPhone = phoneNumber.replace(/\s/g, '').replace(/^0/, '')
    const fullPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`

    // Send WhatsApp message
    const result = await sendWhatsAppMessage({
      to: fullPhone,
      message: message,
      type: metadata?.type || 'custom',
    })

    if (!result.success) {
      console.error('Custom WhatsApp message failed:', result.error)
      return {
        success: false,
        error: result.error || 'Failed to send WhatsApp message',
      }
    }

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error("WHATSAPP ERROR:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message",
    }
  }
}

// Optional: Function to send WhatsApp notification by client ID
export async function sendWhatsAppToClient(
  clientId: string,
  status: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Find the client
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    })

    if (!client) {
      return {
        success: false,
        error: `Client not found: ${clientId}`,
      }
    }

    if (!client.phone) {
      return {
        success: false,
        error: 'Client has no phone number',
      }
    }

    // Format phone number
    const formattedPhone = client.phone.replace(/\s/g, '').replace(/^0/, '')
    const fullPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`

    // Get status template
    const statusKey = 
      status === 'PENDING' ? 'SUBMITTED' :
      status === 'IN_PROGRESS' ? 'IN_PROGRESS' :
      status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' :
      status === 'HARD_COPY_REQUIRED' ? 'HARD_COPY_REQUIRED' :
      status === 'APPROVED' ? 'APPROVED' :
      status === 'REJECTED' ? 'REJECTED' :
      status === 'COMPLETED' ? 'COMPLETED' :
      'SUBMITTED'

    const template = APPLICATION_WHATSAPP[statusKey as keyof typeof APPLICATION_WHATSAPP]

    if (!template) {
      return {
        success: false,
        error: `Invalid status: ${status}`,
      }
    }

    // Build message
    const messageContent = template.buildMessage({
      clientName: client.name || undefined,
      applicationNumber: 'N/A',
      status: status,
      serviceName: 'N/A',
      adminNotes: adminNotes,
    })

    // Send message
    const result = await sendWhatsAppMessage({
      to: fullPhone,
      message: messageContent,
      type: statusKey,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send WhatsApp message',
      }
    }

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error("WHATSAPP ERROR:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message",
    }
  }
}