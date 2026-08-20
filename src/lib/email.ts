import nodemailer from 'nodemailer'
import { db } from './db'
import fs from 'fs'
import path from 'path'
import { getLocalizedText } from './multilingual-text'

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: string | Buffer
    contentType?: string
    cid?: string
  }>
  envelope?: {
    from: string
    to: string
  }
  priority?: 'high' | 'normal' | 'low'
}

interface EmailConfig {
  host: string
  port: number
  username: string
  password: string
  encryption: string
  fromAddress: string
  fromName: string
  tlsServername?: string
}

interface TransportCandidate {
  host: string
  port: number
  secure: boolean
  auth: { user: string; pass: string }
  name: string
  logger?: boolean
  debug?: boolean
  tls?: {
    minVersion?: string
    rejectUnauthorized?: boolean
  }
  requireTLS?: boolean
  connectionTimeout?: number
  greetingTimeout?: number
}

interface EmailResult {
  success: boolean
  messageId?: string
  response?: string
  error?: string
  transportUsed?: string
}

// ============================================================
// LOGO CONFIGURATION
// ============================================================
const logoPath = path.join(process.cwd(), 'public', 'logo-horizontal.png')
let logoBuffer: Buffer | null = null
let logoCID = 'logo@tabadlalkon.com'

try {
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath)
    console.log('[Email] Logo loaded successfully from:', logoPath)
  } else {
    console.warn('[Email] Logo not found at:', logoPath)
  }
} catch (error) {
  console.error('[Email] Error loading logo:', error)
}

export const LOGO_ATTACHMENT = logoBuffer ? {
  filename: 'logo-horizontal.png',
  content: logoBuffer,
  cid: logoCID,
  contentType: 'image/png',
} : null

function getLogoSrc(): string {
  if (logoBuffer) {
    return `cid:${logoCID}`
  }
  // Fallback to public URL
  return 'https://tabadlalkon.com/logo-horizontal.png'
}

// ============================================================
// EMAIL CONFIGURATION
// ============================================================
async function getEmailConfig(): Promise<EmailConfig | null> {
  const host = process.env.SMTP_HOST
  const username = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  
  if (host && username && password) {
    const port = Number(process.env.SMTP_PORT || 587)
    console.log('[Email] Using SMTP configuration from .env')
    console.log('[Email] Host:', host, 'Port:', port, 'User:', username)
    console.log('[Email] From Name:', process.env.SMTP_FROM_NAME || 'Tabadl Alkon')
    return {
      host,
      port,
      username,
      password,
      encryption: port === 465 ? 'ssl' : 'tls',
      fromAddress: process.env.SMTP_FROM || username,
      fromName: process.env.SMTP_FROM_NAME || 'Tabadl Alkon',
      tlsServername: process.env.SMTP_TLS_SERVERNAME || undefined,
    }
  }

  try {
    const settings = await (db as any).emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (settings?.host && settings?.username && settings?.password) {
      console.log('[Email] Using SMTP configuration from database')
      return {
        host: settings.host,
        port: settings.port,
        username: settings.username,
        password: settings.password,
        encryption: settings.encryption,
        fromAddress: settings.fromAddress,
        fromName: settings.fromName || 'Tabadl Alkon',
        tlsServername: (settings as any).tlsServername || undefined,
      }
    }
  } catch (error) {
    console.error('[Email] Error fetching email configuration from database:', error)
  }

  console.error('[Email] No email configuration found. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env')
  return null
}

// ============================================================
// TRANSPORT CANDIDATES
// ============================================================
function createTransportCandidates(config: EmailConfig): TransportCandidate[] {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return [
    {
      host: config.host,
      port: 465,
      secure: true,
      auth: { user: config.username, pass: config.password },
      name: config.host,
      logger: false,
      debug: false,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction,
        ...(config.tlsServername ? { servername: config.tlsServername } : {})
      },
      connectionTimeout: 30000,
      greetingTimeout: 10000,
    },
    {
      host: config.host,
      port: 587,
      secure: false,
      auth: { user: config.username, pass: config.password },
      name: config.host,
      logger: false,
      debug: false,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction,
        ...(config.tlsServername ? { servername: config.tlsServername } : {})
      },
      requireTLS: true,
      connectionTimeout: 30000,
      greetingTimeout: 10000,
    },
    {
      host: config.host,
      port: config.port,
      secure: config.encryption === 'ssl' || config.port === 465,
      auth: { user: config.username, pass: config.password },
      name: config.host,
      logger: false,
      debug: false,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction,
        ...(config.tlsServername ? { servername: config.tlsServername } : {})
      },
      connectionTimeout: 30000,
      greetingTimeout: 10000,
    }
  ]
}

// ============================================================
// LOG EMAIL EVENTS
// ============================================================
function logEmailEvent(...args: any[]) {
  try {
    const timestamp = new Date().toISOString()
    const message = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")
    const logLine = `[${timestamp}] ${message}\n`
    const logFile = path.join(process.cwd(), 'logs', 'email-debug.log')
    fs.mkdirSync(path.dirname(logFile), { recursive: true })
    fs.appendFileSync(logFile, logLine)
  } catch (error) {
    // Ignore logging errors
  }
}

// ============================================================
// SEND EMAIL WITH TRANSPORT
// ============================================================
async function trySendWithTransport(candidate: TransportCandidate, mailOptions: any): Promise<EmailResult> {
  const transporter = nodemailer.createTransport(candidate as any)

  try {
    await transporter.verify()
  } catch (err: any) {
    try { await transporter.close() } catch (_) {}
    throw err
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    await transporter.close()
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      transportUsed: `${candidate.host}:${candidate.port}`
    }
  } catch (err: any) {
    try { await transporter.close() } catch (_) {}
    throw err
  }
}

// ============================================================
// MAIN SEND EMAIL FUNCTION
// ============================================================
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  console.log('[Email] sendEmail called with:', { to: options.to, subject: options.subject })
  
  const config = await getEmailConfig()
  if (!config) {
    const error = 'Email configuration not found. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env'
    console.error('[Email]', error)
    return { success: false, error }
  }

  console.log('[Email] Using config:', { 
    host: config.host, 
    port: config.port, 
    from: config.fromAddress, 
    fromName: config.fromName 
  })

  const fromDomain = config.fromAddress.split('@')[1] || 'tk.sa'
  
  // ✅ FIX: Show "Tabadl Alkon" as sender name
  const fromWithName = `"${config.fromName}" <${config.fromAddress}>`
  
  // Prepare attachments with logo
  let attachments = options.attachments || []
  if (LOGO_ATTACHMENT) {
    attachments = [...attachments, LOGO_ATTACHMENT]
  }
  
  // Clean up any raw bilingual JSON strings in html or text body
  const cleanHtml = options.html ? options.html.replace(/\{"en":"([^"]*)","ar":"[^"]*"\}/g, '$1') : options.html
  const cleanText = options.text ? options.text.replace(/\{"en":"([^"]*)","ar":"[^"]*"\}/g, '$1') : options.text

  const mailOptions = {
    from: fromWithName,
    to: options.to,
    subject: options.subject,
    text: cleanText,
    html: cleanHtml,
    attachments: attachments,
    envelope: options.envelope || {
      from: fromWithName,
      to: options.to
    },
    messageId: `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${fromDomain}>`,
    ...(options.priority && { priority: options.priority })
  }

  const transportCandidates = createTransportCandidates(config)
  let lastError: any = null

  for (let i = 0; i < transportCandidates.length; i++) {
    const candidate = transportCandidates[i]
    try {
      console.log(`[Email] Trying transport ${i + 1}/${transportCandidates.length}: ${candidate.host}:${candidate.port}`)
      const result = await trySendWithTransport(candidate, mailOptions)
      console.log('[Email] Email sent successfully!', { messageId: result.messageId, transport: result.transportUsed })
      return result
    } catch (err: any) {
      lastError = err
      console.log(`[Email] Transport ${i + 1} failed:`, err.message)
      if (i < transportCandidates.length - 1) {
        continue
      }
    }
  }

  const errorMessage = `All email transport attempts failed. Last error: ${lastError ? String(lastError) : 'Unknown error'}`
  console.error('[Email] Failed to send email:', errorMessage)
  
  return {
    success: false,
    error: errorMessage
  }
}

// ============================================================
// GENERATE EMAIL HEADER WITH LOGO
// ============================================================
function getEmailHeader(): string {
  const logoSrc = getLogoSrc()
  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${logoSrc}" alt="Tabadl Alkon" style="max-width: 150px; height: auto;" />
    </div>
  `
}

// ============================================================
// GENERATE EMAIL FOOTER
// ============================================================
function getEmailFooter(): string {
  const currentYear = new Date().getFullYear()
  return `
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      &copy; ${currentYear} Tabadl Alkon. All rights reserved.
    </p>
    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 4px;">
      This email was sent from Tabadl Alkon CRM System
    </p>
  `
}

// ============================================================
// WELCOME EMAIL
// ============================================================
export async function sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
  const currentYear = new Date().getFullYear()
  
  const subject = 'Welcome to Tabadl Alkon!'
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center; font-size: 24px; margin-bottom: 20px;">Welcome to Tabadl Alkon!</h2>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your account has been successfully created. You can now:</p>
      
      <ul style="color: #334155; font-size: 15px; line-height: 2; padding-left: 20px;">
        <li>Track your business applications in real-time</li>
        <li>Upload and manage documents securely</li>
        <li>Check your application status anytime</li>
        <li>Receive important updates and notifications</li>
      </ul>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${dashboardUrl}" 
           style="display: inline-block; background: #0B6B37; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        If you have any questions, contact us at <a href="mailto:support@tabadlalkon.com" style="color: #0B6B37;">support@tabadlalkon.com</a>
      </p>
      
      ${getEmailFooter()}
    </div>
  `

  const text = `
Welcome to Tabadl Alkon!

Hi ${name},

Your account has been successfully created. You can now:

- Track your business applications in real-time
- Upload and manage documents securely
- Check your application status anytime
- Receive important updates and notifications

Go to Dashboard: ${dashboardUrl}

If you have any questions, contact us at support@tabadlalkon.com

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject,
    html,
    text
  })
}

// ============================================================
// EMAIL VERIFICATION (SIGNUP)
// ============================================================
export async function sendEmailVerificationEmail(
  to: string,
  rawName: string,
  verificationToken: string
): Promise<EmailResult> {
  const name = getLocalizedText(rawName, 'en')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/verify-email/${verificationToken}`
  const currentYear = new Date().getFullYear()
  const subject = 'Verify your email address'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center; font-size: 24px; margin-bottom: 20px;">Verify Your Email</h2>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        Thanks for signing up with Tabadl Alkon. Please verify your email address to activate your account and sign in.
      </p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${verifyUrl}" 
           style="display: inline-block; background: #0B6B37; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Verify Email
        </a>
      </div>
      
      <div style="background: #fef9e7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Important:</strong> This link will expire in 24 hours. If you didn't create an account, you can ignore this email.
        </p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Need help? Contact us at <a href="mailto:support@tabadlalkon.com" style="color: #0B6B37;">support@tabadlalkon.com</a>
      </p>
      
      ${getEmailFooter()}
    </div>
  `

  const text = `
Verify Your Email

Hi ${name},

Thanks for signing up with Tabadl Alkon. Please verify your email address to activate your account and sign in:

${verifyUrl}

Important: This link will expire in 24 hours. If you didn't create an account, you can ignore this email.

Need help? Contact us at support@tabadlalkon.com

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject,
    html,
    text
  })
}

// ============================================================
// PASSWORD RESET EMAIL
// ============================================================
export async function sendPasswordResetEmail(
  to: string, 
  name: string, 
  resetToken: string,
  userType: 'client' | 'admin' = 'client'
): Promise<EmailResult> {
  console.log('[Email] Sending password reset email to:', to)
  console.log('[Email] Reset token:', resetToken)
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/${userType}/reset-password/${resetToken}`
  console.log('[Email] Reset URL:', resetUrl)
  
  const currentYear = new Date().getFullYear()
  const subject = 'Password Reset Request'
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Reset Request</h2>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        We received a request to reset your password. Click the button below to set a new password.
      </p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" 
           style="display: inline-block; background: #0B6B37; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      
      <div style="background: #fef9e7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Important:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Need help? Contact us at <a href="mailto:support@tabadlalkon.com" style="color: #0B6B37;">support@tabadlalkon.com</a>
      </p>
      
      ${getEmailFooter()}
    </div>
  `

  const text = `
Password Reset Request

Hi ${name},

We received a request to reset your password. Click the link below to set a new password:

${resetUrl}

Important: This link will expire in 1 hour. If you didn't request this, please ignore this email.

Need help? Contact us at support@tabadlalkon.com

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  console.log('[Email] Calling sendEmail for password reset...')
  const result = await sendEmail({
    to,
    subject,
    html,
    text
  })
  console.log('[Email] Password reset email result:', result)
  return result
}

// ============================================================
// COLLABORATOR INVITE EMAIL
// ============================================================
export async function sendCollaboratorInviteEmail(options: {
  to: string
  inviteToken: string
  clientName: string
  inviterName?: string | null
}): Promise<EmailResult> {
  const { to, inviteToken, clientName, inviterName } = options
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/collaborator/${inviteToken}`
  const currentYear = new Date().getFullYear()
  const subject = `${clientName} invited you to collaborate on Tabadl Alkon`
  const who = inviterName || clientName

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center; font-size: 24px; margin-bottom: 20px;">Collaboration Invite</h2>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello,</p>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        <strong>${who}</strong> invited you to collaborate on their Tabadl Alkon account
        (<strong>${clientName}</strong>). As a collaborator, you can view and fill applications on their behalf.
      </p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${inviteUrl}" 
           style="display: inline-block; background: #0B6B37; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Accept Invite
        </a>
      </div>
      
      <div style="background: #fef9e7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Note:</strong> This invite expires in 7 days. A collaborator can only be linked to one client account.
        </p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Need help? Contact us at <a href="mailto:support@tabadlalkon.com" style="color: #0B6B37;">support@tabadlalkon.com</a>
      </p>
      
      ${getEmailFooter()}
    </div>
  `

  const text = `
Collaboration Invite

Hello,

${who} invited you to collaborate on their Tabadl Alkon account (${clientName}).
As a collaborator, you can view and fill applications on their behalf.

Accept invite: ${inviteUrl}

Note: This invite expires in 7 days. A collaborator can only be linked to one client account.

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({ to, subject, html, text })
}

// ============================================================
// PASSWORD CHANGE ALERT EMAIL
// ============================================================
export async function sendPasswordChangeEmail(to: string, name: string): Promise<EmailResult> {
  const currentDate = new Date().toLocaleString()
  const currentYear = new Date().getFullYear()
  const subject = 'Password Changed Successfully'
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Changed Successfully</h2>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        Your password was changed on <strong>${currentDate}</strong>.
      </p>
      
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #991b1b; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
          If you didn't make this change:
        </p>
        <ul style="color: #991b1b; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Contact our support team immediately</li>
          <li>Check your account for any suspicious activity</li>
          <li>Enable two-factor authentication for extra security</li>
        </ul>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        If you have any concerns, contact us at <a href="mailto:support@tabadlalkon.com" style="color: #0B6B37;">support@tabadlalkon.com</a>
      </p>
      
      ${getEmailFooter()}
    </div>
  `

  const text = `
Password Changed Successfully

Hi ${name},

Your password was changed on ${currentDate}.

If you didn't make this change:
- Contact our support team immediately
- Check your account for any suspicious activity
- Enable two-factor authentication for extra security

If you have any concerns, contact us at support@tabadlalkon.com

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject,
    html,
    text
  })
}

// ============================================================
// ACCOUNT CREDENTIALS EMAIL
// ============================================================
export async function sendAccountCredentialsEmail(
  to: string,
  name: string,
  password: string,
  roleLabel: string
) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tk.sa'}/admin/login`
  const clientLoginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tk.sa'}/login`
  const isStaff = roleLabel.toLowerCase().includes('staff') || roleLabel === 'STAFF'
  const portalUrl = isStaff ? loginUrl : clientLoginUrl
  const currentYear = new Date().getFullYear()

  const subject = 'Your Tabadl Alkon Account Credentials'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center; margin-bottom: 8px;">Welcome to Tabadl Alkon</h2>
      <p style="color: #374151;">Dear ${name},</p>
      <p style="color: #374151;">Your ${roleLabel} account has been created. Use the credentials below to sign in:</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${password}</code></p>
      </div>
      <p style="color: #374151;">For security, please change your password after your first login.</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="${portalUrl}" style="display:inline-block;background:#0B6B37;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Sign In</a>
      </p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px; text-align: center;">If you did not expect this email, please contact your administrator.</p>
      
      ${getEmailFooter()}
    </div>
  `
  
  const text = `
Welcome to Tabadl Alkon

Email: ${to}
Temporary Password: ${password}

Sign in: ${portalUrl}

Please change your password after first login.

If you did not expect this email, please contact your administrator.

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({ to, subject, html, text })
}

// ============================================================
// NOTIFICATION EMAIL
// ============================================================
export async function sendNotificationEmail(
  to: string, 
  title: string, 
  message: string, 
  actionUrl?: string
) {
  const currentYear = new Date().getFullYear()
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center;">${title}</h2>
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #374151; margin: 0;">${message}</p>
      </div>
      ${actionUrl ? `
        <div style="text-align: center; margin: 20px 0;">
          <a href="${actionUrl}" 
             style="background-color: #0B6B37; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            View Details
          </a>
        </div>
      ` : ''}
      
      ${getEmailFooter()}
    </div>
  `

  return sendEmail({
    to,
    subject: title,
    html,
    text: message
  })
}

// ============================================================
// CONSULTATION CONFIRMATION EMAIL
// ============================================================
export async function sendConsultationConfirmationEmail(
  to: string,
  formData: {
    fullName: string
    email: string
    phone: string
    companyName: string
    companyType: string
    natureOfBusiness: string
    designation: string
    country: string
    city: string
    howDidYouHear: string
    businessTypes: string[]
  }
) {
  const subject = 'Thank You for Your Business Consultation Request'
  const currentYear = new Date().getFullYear()
  
  let contactEmail = 'info@tabadlalkon.com'
  let contactPhone = '+966 50 000 0000'
  
  try {
    const settings = await (db as any).emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    if (settings?.contactEmail) {
      contactEmail = settings.contactEmail
    }
    if (settings?.contactPhone) {
      contactPhone = settings.contactPhone
    }
  } catch (error) {
    console.error('Error fetching contact information from settings:', error)
  }
  
  const businessTypesList = formData.businessTypes.map(type => `- ${type}`).join('\n')
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      ${getEmailHeader()}
      
      <h2 style="color: #0B6B37; text-align: center; font-size: 24px;">Thank You, ${formData.fullName}!</h2>
      <p style="color: #6b7280; text-align: center; font-size: 16px;">Your consultation request has been received</p>
      
      <div style="background: linear-gradient(135deg, #0B6B37 0%, #14532D 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
        <p style="color: #ffffff; font-size: 16px; margin: 0;">
          Thank you for your interest in Tabadl Alkon's business services. Our team will contact you within 24-48 hours.
        </p>
      </div>
      
      <div style="background-color: #f8fafb; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
        <h3 style="color: #0B6B37; margin-top: 0; font-size: 18px; border-bottom: 2px solid #0B6B37; padding-bottom: 10px;">
          Your Submission Details
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Full Name:</td><td style="padding: 8px 0; color: #0f172a;">${formData.fullName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td><td style="padding: 8px 0; color: #0f172a;">${formData.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Phone:</td><td style="padding: 8px 0; color: #0f172a;">${formData.phone}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Company:</td><td style="padding: 8px 0; color: #0f172a;">${formData.companyName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Location:</td><td style="padding: 8px 0; color: #0f172a;">${formData.city}, ${formData.country}</td></tr>
        </table>
      </div>
      
      <div style="background: #eff6ff; padding: 16px; border-radius: 10px; border-left: 4px solid #0369a1; margin-bottom: 20px;">
        <h4 style="color: #0369a1; margin-top: 0; margin-bottom: 10px; font-size: 16px;">What Happens Next?</h4>
        <ul style="color: #334155; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Our expert team will review your consultation request</li>
          <li>We will contact you within 24-48 hours</li>
          <li>We'll schedule a consultation call</li>
          <li>You'll receive a customized proposal</li>
        </ul>
      </div>
      
      <div style="background: #f9fafb; padding: 16px; border-radius: 10px; text-align: center;">
        <p style="color: #334155; margin: 0 0 8px 0; font-weight: 600;">Need Immediate Assistance?</p>
        <p style="color: #0B6B37; margin: 0;">Email: ${contactEmail}</p>
        <p style="color: #0B6B37; margin: 0;">Phone: ${contactPhone}</p>
      </div>
      
      ${getEmailFooter()}
    </div>
  `

  const text = `
Thank You, ${formData.fullName}!

Your consultation request has been received.

Thank you for your interest in Tabadl Alkon's business services. Our team will contact you within 24-48 hours.

YOUR SUBMISSION DETAILS:
- Full Name: ${formData.fullName}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Company: ${formData.companyName}
- Location: ${formData.city}, ${formData.country}

WHAT HAPPENS NEXT?
- Our expert team will review your consultation request
- We will contact you within 24-48 hours
- We'll schedule a consultation call
- You'll receive a customized proposal

NEED IMMEDIATE ASSISTANCE?
Email: ${contactEmail}
Phone: ${contactPhone}

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject,
    html,
    text
  })
}

// ============================================================
// CONSULTATION STAFF NOTIFICATION EMAIL
// ============================================================
export async function sendConsultationStaffNotificationEmail(
  formData: {
    fullName: string
    email: string
    phone: string
    companyName: string
    companyType: string
    natureOfBusiness: string
    designation: string
    country: string
    city: string
    howDidYouHear: string
    businessTypes: string[]
  }
) {
  let staffEmails: string[] = []
  
  try {
    const settings = await (db as any).emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    if (settings?.businessConsultationRecipients) {
      try {
        staffEmails = JSON.parse(settings.businessConsultationRecipients)
        if (!Array.isArray(staffEmails)) {
          staffEmails = []
        }
      } catch (parseError) {
        if (typeof settings.businessConsultationRecipients === 'string') {
          staffEmails = settings.businessConsultationRecipients.split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching staff email addresses from settings:', error)
    staffEmails = []
  }

  if (!staffEmails || staffEmails.length === 0) {
    console.warn('[Email] No business consultation recipients configured in email settings')
    return { success: false, message: 'No business consultation recipients configured' }
  }

  const currentYear = new Date().getFullYear()
  const subject = `New Consultation Request - ${formData.fullName}`
  
  const businessTypesList = formData.businessTypes.length > 0 
    ? formData.businessTypes.map(type => `- ${type}`).join('\n')
    : 'Not specified'
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      ${getEmailHeader()}
      
      <h2 style="color: #dc2626; text-align: center; font-size: 24px;">New Consultation Request</h2>
      <p style="color: #6b7280; text-align: center; font-size: 16px;">A new business consultation form has been submitted</p>
      
      <div style="background: #dc2626; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
        <p style="color: #ffffff; font-size: 16px; margin: 0;">
          <strong>${formData.fullName}</strong> has submitted a new consultation request. Please review and contact them within 24-48 hours.
        </p>
      </div>
      
      <div style="background-color: #f8fafb; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
        <h3 style="color: #0B6B37; margin-top: 0; font-size: 18px; border-bottom: 2px solid #0B6B37; padding-bottom: 10px;">Submission Details</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Full Name:</td><td style="padding: 8px 0; color: #0f172a;">${formData.fullName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td><td style="padding: 8px 0; color: #0f172a;">${formData.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Phone:</td><td style="padding: 8px 0; color: #0f172a;">${formData.phone}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Company:</td><td style="padding: 8px 0; color: #0f172a;">${formData.companyName || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Location:</td><td style="padding: 8px 0; color: #0f172a;">${formData.city}, ${formData.country}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Business Types:</td><td style="padding: 8px 0; color: #0f172a; white-space: pre-wrap;">${businessTypesList}</td></tr>
        </table>
      </div>
      
      <div style="background: #fef2f2; padding: 16px; border-radius: 10px; border-left: 4px solid #dc2626; margin-bottom: 20px;">
        <h4 style="color: #dc2626; margin-top: 0; margin-bottom: 10px; font-size: 16px;">Action Required</h4>
        <ul style="color: #334155; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Contact <strong>${formData.fullName}</strong> within 24-48 hours</li>
          <li>Review their business requirements</li>
          <li>Schedule a consultation call</li>
          <li>Create a lead in the CRM system</li>
        </ul>
      </div>
      
      ${getEmailFooter()}
    </div>
  `

  const text = `
New Consultation Request

${formData.fullName} has submitted a new consultation request.

SUBMISSION DETAILS:
- Full Name: ${formData.fullName}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Company: ${formData.companyName || 'Not provided'}
- Location: ${formData.city}, ${formData.country}
- Business Types: ${formData.businessTypes.join(', ') || 'Not specified'}

ACTION REQUIRED:
- Contact ${formData.fullName} within 24-48 hours
- Review their business requirements
- Schedule a consultation call
- Create a lead in the CRM system

© ${currentYear} Tabadl Alkon. All rights reserved.
  `.trim()

  const emailPromises = staffEmails.map((email: string) => {
    return sendEmail({
      to: email.trim(),
      subject,
      html,
      text
    }).catch((error) => {
      console.error(`Failed to send consultation notification email to ${email}:`, error)
      return { success: false, email, error }
    })
  })

  const results = await Promise.all(emailPromises)
  const successCount = results.filter(r => r && (r as any).success !== false).length

  return {
    success: successCount > 0,
    total: staffEmails.length,
    successCount,
    results
  }
}

// ============================================================
// VERIFY EMAIL CONFIGURATION
// ============================================================
export async function verifyEmailConfiguration() {
  const config = await getEmailConfig()
  if (!config) {
    const error = 'Email configuration not found'
    return { success: false, message: error }
  }

  const transportCandidates = createTransportCandidates(config)
  let lastError: any = null

  for (let i = 0; i < transportCandidates.length; i++) {
    const candidate = transportCandidates[i]
    try {
      const transporter = nodemailer.createTransport(candidate as any)
      await transporter.verify()
      await transporter.close()
      
      return { 
        success: true, 
        message: `Email configuration is valid (using ${candidate.host}:${candidate.port})` 
      }
    } catch (err: any) {
      lastError = err
      if (i < transportCandidates.length - 1) {
        continue
      }
    }
  }

  const errorMessage = `All email transport verification attempts failed. Last error: ${lastError ? String(lastError) : 'Unknown error'}`
  
  return { 
    success: false, 
    message: errorMessage 
  }
}

// ============================================================
// TEST EMAIL WITH FORM DATA
// ============================================================
export async function sendTestEmailWithFormData(
  formData: {
    host: string
    port: number
    username: string
    password: string
    encryption: string
    fromAddress: string
    fromName: string
    tlsServername?: string
  },
  to: string,
  testMessage?: string
): Promise<EmailResult> {
  
  const defaultMessage = `Hello!

This is a test email sent from the Tabadl Alkon CRM admin panel using your FORM DATA configuration.

Configuration used:
- Host: ${formData.host}
- Port: ${formData.port}
- Encryption: ${formData.encryption}
- From: ${formData.fromAddress}

If you receive this email, your form configuration is working correctly!

Sent at: ${new Date().toISOString()}

Best regards,
Tabadl Alkon CRM System`

  const fromAddress = formData.fromAddress || formData.username || 'request@tk.sa'
  const fromName = formData.fromName || 'Tabadl Alkon'
  const fromDomain = fromAddress.split('@')[1] || 'tk.sa'
  
  const fromWithName = `"${fromName}" <${fromAddress}>`
  
  const mailOptions = {
    from: fromWithName,
    to: to,
    subject: `Test Email from Tabadl Alkon CRM - ${new Date().toLocaleString()}`,
    text: testMessage || defaultMessage,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://tabadlalkon.com/logo-horizontal.png" alt="Tabadl Alkon" style="max-width: 150px; height: auto;" />
        </div>
        <h2 style="color: #0B6B37; text-align: center;">Test Email from Tabadl Alkon CRM</h2>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <p>This is a test email sent using your FORM DATA configuration.</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin-top: 0;">Configuration Used:</h3>
          <ul style="color: #374151;">
            <li><strong>Host:</strong> ${formData.host}</li>
            <li><strong>Port:</strong> ${formData.port}</li>
            <li><strong>Encryption:</strong> ${formData.encryption}</li>
            <li><strong>From:</strong> ${fromAddress}</li>
          </ul>
        </div>
        <p>If you receive this email, your form configuration is working correctly!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          From: ${fromAddress}<br>
          Server: ${formData.host}
        </p>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 4px;">
          &copy; ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
        </p>
      </div>
    `,
    envelope: {
      from: fromWithName,
      to: to
    },
    messageId: `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${fromDomain}>`
  }

  const isProduction = process.env.NODE_ENV === 'production'
  
  const transportCandidates = [
    {
      host: formData.host,
      port: 465,
      secure: true,
      auth: { user: formData.username, pass: formData.password },
      name: formData.host,
      logger: !isProduction,
      debug: !isProduction,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction,
        ...(formData.tlsServername ? { servername: formData.tlsServername } : {})
      },
      connectionTimeout: 30000,
      greetingTimeout: 10000,
    },
    {
      host: formData.host,
      port: 587,
      secure: false,
      auth: { user: formData.username, pass: formData.password },
      name: formData.host,
      logger: !isProduction,
      debug: !isProduction,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction,
        ...(formData.tlsServername ? { servername: formData.tlsServername } : {})
      },
      requireTLS: true,
      connectionTimeout: 30000,
      greetingTimeout: 10000,
    },
    {
      host: formData.host,
      port: formData.port,
      secure: formData.encryption === 'ssl' || formData.port === 465,
      auth: { user: formData.username, pass: formData.password },
      name: formData.host,
      logger: !isProduction,
      debug: !isProduction,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction,
        ...(formData.tlsServername ? { servername: formData.tlsServername } : {})
      },
      connectionTimeout: 30000,
      greetingTimeout: 10000,
    }
  ]

  let lastError = null

  for (let i = 0; i < transportCandidates.length; i++) {
    const candidate = transportCandidates[i]
    try {
      const transporter = nodemailer.createTransport(candidate as any)
      await transporter.verify()
      const info = await transporter.sendMail(mailOptions)
      await transporter.close()
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        transportUsed: `${candidate.host}:${candidate.port}`
      }
    } catch (err: any) {
      lastError = err
      if (i < transportCandidates.length - 1) {
        continue
      }
    }
  }

  const errorMessage = `All email transport attempts failed. Last error: ${lastError ? String(lastError) : 'Unknown error'}`
  console.error('[Email] Test email failed:', errorMessage)
  
  return {
    success: false,
    error: errorMessage
  }
}