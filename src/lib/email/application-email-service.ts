import nodemailer from "nodemailer";
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { promises as dns } from 'node:dns';
import type { Transporter } from 'nodemailer';
import { APPLICATION_EMAILS, LOGO_ATTACHMENT } from "./application-templates";
import { db } from "@/lib/db";

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

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = smtpPort === 465;
const smtpRequireTLS = smtpPort === 587;

let transporter: Transporter<SMTPTransport.Options> | null = null;

async function ensureTransporter(): Promise<Transporter<SMTPTransport.Options>> {
  if (transporter) return transporter;

  const lookupResult = await dns.lookup(smtpHost, { family: 4 }).catch(() => null as null | { address: string });
  const connectHost = lookupResult?.address ?? smtpHost;

  transporter = nodemailer.createTransport({
    host: connectHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: smtpRequireTLS,
    family: 4,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { servername: smtpHost },
  } as SMTPTransport.Options);

  return transporter;
}

export async function sendApplicationStatusEmail(
  payload: ApplicationEmailPayload
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const tr = await ensureTransporter();

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

  // ✅ FIXED: Use wizardApplication instead of application
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
      // ✅ FIXED: Use areaOfInterest directly from wizardApplication
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
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    await tr.verify();
    console.log('SMTP connection successful');

    const messageId = generateMessageId(application.id);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const appIdShort = application.id.substring(0, 8);
    
    const uniqueSubject = `${template.subject} [${application.applicationNumber || appIdShort}-${randomSuffix}]`;

    const info = await tr.sendMail({
      from: {
        name: 'Tabadl Alkon',
        address: process.env.SMTP_FROM || 'info@tabadlalkon.com',
      },
      to: recipient,
      subject: uniqueSubject,
      html: emailHtml,
      attachments: [LOGO_ATTACHMENT],
      headers: {
        'Message-ID': messageId,
        'References': '',
        'In-Reply-To': '',
        'X-Mailer': 'Tabadl Alkon System',
        'X-Entity-Ref-ID': `app-${application.id}-${timestamp}`,
        'X-Thread-ID': `new-${application.id}-${timestamp}`,
        'Auto-Submitted': 'auto-generated',
        'X-Application-ID': application.id,
        'X-Email-Type': statusKey,
        'X-GM-THRID': '',
        'X-Google-Original-From': 'Tabadl Alkon',
        'X-Unique-ID': `${application.id}-${timestamp}-${randomSuffix}`,
        'X-MS-Exchange-Organization-Network-Message-Id': messageId,
      },
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send email",
    };
  }
}