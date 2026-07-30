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
  | "APPROVED"
  | "REJECTED";

export interface ApplicationEmailPayload {
  applicationId?: string;
  applicationNumber?: string;
  status?: string;
  recipientEmail?: string;
  serviceName?: string;
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
) {
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

  const application = await db.application.findUnique({
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
  const statusKey =
    rawStatus === 'PENDING'
      ? 'SUBMITTED'
      : rawStatus === 'IN_PROGRESS'
      ? 'IN_PROGRESS'
      : rawStatus === 'APPROVED'
      ? 'APPROVED'
      : rawStatus === 'REJECTED'
      ? 'REJECTED'
      : 'SUBMITTED';

  const template = APPLICATION_EMAILS[statusKey as ApplicationEmailType];

  if (!template) {
    return {
      success: false,
      error: `Invalid status: ${rawStatus}`,
    };
  }

  const detailRows = [
    {
      label: 'Application ID',
      value: application.applicationNumber || application.id,
    },
    {
      label: 'Submitted On',
      value: formatDateTimeForEmail(application.createdAt),
    },
    {
      label: 'Current Status',
      value: rawStatus.replace(/_/g, ' '),
      isLast: true,
    },
  ];

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

    // Generate unique identifiers
    const messageId = generateMessageId(application.id);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const appIdShort = application.id.substring(0, 8);
    
    // CRITICAL: Make subject COMPLETELY unique to break threading
    const uniqueSubject = `${template.subject} [${application.applicationNumber || appIdShort}-${randomSuffix}]`;

    const info = await tr.sendMail({
      from: {
        name: 'Tabadl Alkon',
        address: process.env.SMTP_FROM || 'info@tabadlalkon.com',
      },
      to: recipient,
      subject: uniqueSubject,
      html: emailHtml,
      // ADD THIS: Attach the logo using CID
      attachments: [LOGO_ATTACHMENT],
      headers: {
        // CRITICAL: These headers tell email clients this is a new thread
        'Message-ID': messageId,
        'References': '', // Empty = start new thread
        'In-Reply-To': '', // Empty = start new thread
        'X-Mailer': 'Tabadl Alkon System',
        'X-Entity-Ref-ID': `app-${application.id}-${timestamp}`,
        'X-Thread-ID': `new-${application.id}-${timestamp}`,
        'Auto-Submitted': 'auto-generated',
        'X-Application-ID': application.id,
        'X-Email-Type': statusKey,
        // Gmail specific: Force new thread
        'X-GM-THRID': '',
        // Prevent auto-grouping
        'X-Google-Original-From': 'Tabadl Alkon',
        // Add a random header to make it unique
        'X-Unique-ID': `${application.id}-${timestamp}-${randomSuffix}`,
        // Outlook specific
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