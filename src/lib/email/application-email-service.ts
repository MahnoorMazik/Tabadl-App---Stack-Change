import nodemailer from "nodemailer";
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { promises as dns } from 'node:dns';
import type { Transporter } from 'nodemailer';
import { APPLICATION_EMAILS } from "./application-templates";
import { db } from "@/lib/db";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

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
// Use SMTPS (secure) for port 465, STARTTLS for port 587
const smtpSecure = smtpPort === 465;
const smtpRequireTLS = smtpPort === 587;

let transporter: Transporter<SMTPTransport.Options> | null = null;

async function ensureTransporter(): Promise<Transporter<SMTPTransport.Options>> {
  if (transporter) return transporter;

  // Resolve IPv4 address for the SMTP host to avoid IPv6 timeouts
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
    // Ensure TLS uses the original hostname for SNI/certificate verification
    tls: { servername: smtpHost },
  } as SMTPTransport.Options);

  return transporter;
}

export async function sendApplicationStatusEmail(
  payload: ApplicationEmailPayload
) {
  // Ensure transporter uses IPv4-resolved address to avoid IPv6 timeouts
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
    const logoPath = resolve(process.cwd(), 'public', 'logo-horizontal.png');
    const attachments = existsSync(logoPath)
      ? [
          {
            filename: 'logo-horizontal.png',
            path: logoPath,
            cid: 'tk-logo@tabadlalkon',
            contentType: 'image/png',
          },
        ]
      : [];

    const info = await tr.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject: template.subject,
      html: emailHtml,
      attachments,
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