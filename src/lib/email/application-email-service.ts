import { APPLICATION_EMAILS, LOGO_ATTACHMENT } from "./application-templates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getClientNotificationFlags } from "@/lib/settings/general";

// Helper: format dates for emails using configured timezone
const formatDateTimeForEmail = (d?: Date | string | null) => {
  const date = d ? new Date(d) : new Date()
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: process.env.APP_TIMEZONE || 'UTC',
    }).format(date)
  } catch (e) {
    return date.toLocaleString('en-GB')
  }
}

// Generate a truly unique Message-ID
function generateMessageId(applicationId?: string) {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const domain = 'tabadlalkon.com';
  const appId = applicationId ? `-${applicationId.substring(0, 8)}` : '';
  return `<${time}.${random}${appId}@${domain}>`;
}

export type ApplicationEmailType =
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "HARD_COPY_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export interface ApplicationEmailPayload {
  applicationId?: string;
  applicationNumber?: string;
  status?: string;
  recipientEmail?: string;
  serviceName?: string;
  adminNotes?: string;
}

export async function sendApplicationStatusEmail(
  payload: ApplicationEmailPayload
): Promise<{ success: boolean; skipped?: boolean; error?: string; messageId?: string }> {
  try {
    // 🔥 Check if email is enabled from database
    const settings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        enableNewBusinessEmail: true,
        host: true,
        password: true,
      }
    })

    // Check if email is configured
    if (!settings?.host || !settings?.password) {
      return {
        success: false,
        skipped: true,
        error: 'Email configuration not found. Please setup SMTP in Admin → Email Settings.',
      }
    }

    // Check if business emails are enabled
    if (!settings.enableNewBusinessEmail) {
      return {
        success: false,
        skipped: true,
        error: 'Business email notifications are disabled in Settings. Enable in Admin → Email Settings.',
      }
    }

    // Also check general notification flags
    const flags = await getClientNotificationFlags();
    if (!flags.emailEnabled) {
      return {
        success: false,
        skipped: true,
        error: 'Client email notifications are disabled in General Settings',
      };
    }

    const where = payload.applicationId
      ? { id: payload.applicationId }
      : payload.applicationNumber
      ? { applicationNumber: payload.applicationNumber }
      : undefined;

    if (!where) {
      return {
        success: false,
        error: 'applicationId or applicationNumber is required',
      };
    }

    // Fetch application with client details
    const application = await db.wizardApplication.findUnique({
      where,
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!application) {
      return {
        success: false,
        error: `Application not found: ${payload.applicationId ?? payload.applicationNumber}`,
      };
    }

    const rawStatus = payload.status || application.status;
    
    // Map statuses correctly
    const statusKey = 
      rawStatus === 'PENDING' ? 'SUBMITTED' :
      rawStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' :
      rawStatus === 'UNDER_REVIEW' ? 'UNDER_REVIEW' :
      rawStatus === 'HARD_COPY_REQUIRED' ? 'HARD_COPY_REQUIRED' :
      rawStatus === 'APPROVED' ? 'APPROVED' :
      rawStatus === 'REJECTED' ? 'REJECTED' :
      rawStatus === 'COMPLETED' ? 'COMPLETED' :
      'SUBMITTED';

    const template = APPLICATION_EMAILS[statusKey as keyof typeof APPLICATION_EMAILS];

    if (!template) {
      return {
        success: false,
        error: `Invalid status: ${rawStatus}`,
      };
    }

    const displayStatus = rawStatus.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const detailRows = [
      {
        label: 'Application ID',
        value: application.applicationNumber || application.id,
      },
      {
        label: 'Service Type',
        value: payload.serviceName || application.areaOfInterest || 'N/A',
      },
      {
        label: 'Submitted On',
        value: formatDateTimeForEmail(application.createdAt),
      },
      {
        label: 'Current Status',
        value: displayStatus,
        isLast: true,
      },
    ];

    if (payload.adminNotes) {
      detailRows.splice(3, 0, {
        label: 'Admin Notes',
        value: payload.adminNotes,
      });
    }

    const emailHtml = template.buildHtml({
      clientName: application.client?.name || undefined,
      detailRows,
    });

    const recipient = payload.recipientEmail || application.client?.email;

    if (!recipient) {
      return {
        success: false,
        error: 'No recipient email available for the application client',
      };
    }

    try {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const appIdShort = application.id.substring(0, 8);
      const uniqueSubject = `${template.subject} [${application.applicationNumber || appIdShort}-${randomSuffix}]`;
      const messageId = generateMessageId(application.id);

      // Use the shared DB-backed SMTP sender (reads from database)
      const result = await sendEmail({
        to: recipient,
        subject: uniqueSubject,
        html: emailHtml,
        attachments: [LOGO_ATTACHMENT as { filename: string; content: Buffer; contentType?: string }],
      });

      if (!result.success) {
        console.error('Application status email failed:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to send email',
        };
      }

      return {
        success: true,
        messageId: result.messageId || messageId,
      };
    } catch (error) {
      console.error("EMAIL ERROR:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  } catch (error) {
    console.error("EMAIL SERVICE ERROR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}