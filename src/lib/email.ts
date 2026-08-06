import nodemailer from 'nodemailer'
import { db } from './db'
import fs from 'fs'
import path from 'path'

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
  }>
  // Enhanced options for robust email sending
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

/**
 * Fetch email configuration from database, with SMTP_* env fallback.
 */
async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const settings = await (db as any).emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (settings?.host && settings?.username && settings?.password) {
      return {
        host: settings.host,
        port: settings.port,
        username: settings.username,
        password: settings.password,
        encryption: settings.encryption,
        fromAddress: settings.fromAddress,
        fromName: settings.fromName,
        tlsServername: (settings as any).tlsServername || undefined,
      }
    }

    if (settings && !settings.password) {
      console.error(
        '[Email] Email settings exist in DB but password is empty. Save SMTP password in Admin → Settings → Email.'
      )
    }
  } catch (error) {
    console.error('Error fetching email configuration:', error)
  }

  const host = process.env.SMTP_HOST
  const username = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  if (host && username && password) {
    const port = Number(process.env.SMTP_PORT || 465)
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

  console.error(
    '[Email] No email configuration found. Save SMTP settings in Admin → Settings → Email (or set SMTP_HOST/SMTP_USER/SMTP_PASSWORD).'
  )
  return null
}

/**
 * Create transport candidates for robust email sending
 * Tries both SSL (465) and STARTTLS (587) configurations
 */
function createTransportCandidates(config: EmailConfig): TransportCandidate[] {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return [
    {
      // SSL/TLS (implicit) - port 465
      host: config.host,
      port: 465,
      secure: true,
      auth: { user: config.username, pass: config.password },
      name: config.host,
      logger: false,
      debug: false,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction, // Secure in production
        ...(config.tlsServername ? { servername: config.tlsServername } : {})
      },
      connectionTimeout: 30_000,
      greetingTimeout: 10_000,
    },
    {
      // STARTTLS (explicit) - port 587
      host: config.host,
      port: 587,
      secure: false, // will upgrade with STARTTLS
      auth: { user: config.username, pass: config.password },
      name: config.host,
      logger: false,
      debug: false,
      tls: {
        minVersion: "TLSv1",
        rejectUnauthorized: isProduction, // Secure in production
        ...(config.tlsServername ? { servername: config.tlsServername } : {})
      },
      requireTLS: true, // force upgrade to TLS
      connectionTimeout: 30_000,
      greetingTimeout: 10_000,
    },
    {
      // Fallback to configured port
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
      connectionTimeout: 30_000,
      greetingTimeout: 10_000,
    }
  ]
}

/**
 * Log email events for debugging
 */
function logEmailEvent(...args: any[]) {
  // Only log to file for debugging, not to console
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

/**
 * Try sending email with a specific transport candidate
 */
async function trySendWithTransport(candidate: TransportCandidate, mailOptions: any): Promise<EmailResult> {
  const transporter = nodemailer.createTransport(candidate as any)

  try {
    // Verify connection/auth first
    await transporter.verify()
  } catch (err: any) {
    try { await transporter.close() } catch (_) {}
    throw err
  }

  try {
    // Send the email
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

/**
 * Send email using robust SMTP configuration with fallback
 * Tries multiple transport configurations for maximum reliability
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const config = await getEmailConfig()
  if (!config) {
    const error =
      'Email configuration not found. Go to Admin → Settings → Email, enter SMTP host/user/password, click Save, then retry.'
    return { success: false, error }
  }

  // Extract domain from fromAddress for proper message ID
  const fromDomain = config.fromAddress.split('@')[1] || 'tk.sa'
  
  // Create mail options with enhanced features
  const mailOptions = {
    from: config.fromAddress,  // Use exact email like test.js for better deliverability
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
    // Use explicit envelope if provided, otherwise use defaults
    envelope: options.envelope || {
      from: config.fromAddress,
      to: options.to
    },
    // Set message ID with proper domain like test.js
    messageId: `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${fromDomain}>`,
    // Add priority if specified
    ...(options.priority && { priority: options.priority })
  }

  // Get transport candidates (465, 587, configured port)
  const transportCandidates = createTransportCandidates(config)
  let lastError: any = null

  // Try each transport candidate until one succeeds
  for (let i = 0; i < transportCandidates.length; i++) {
    const candidate = transportCandidates[i]
    try {
      const result = await trySendWithTransport(candidate, mailOptions)
      return result
    } catch (err: any) {
      lastError = err
      // If this isn't the last candidate, continue to next one
      if (i < transportCandidates.length - 1) {
        continue
      }
    }
  }

  // All transport candidates failed
  const errorMessage = `All email transport attempts failed. Last error: ${lastError ? String(lastError) : 'Unknown error'}`
  console.error('[Email] Failed to send email:', errorMessage)
  
  return {
    success: false,
    error: errorMessage
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(to: string, name: string, emailSettings?: any) {
  const subject = emailSettings?.welcomeEmailSubject || 'Welcome to Tabadl Alkon - Your Business Journey Starts Here!'
  
  // Get contact information from database (email settings)
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
    // Fall back to defaults if database query fails
  }

  let htmlBody = emailSettings?.welcomeEmailBody || `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #059669;">
        <h1 style="color: #059669; margin: 0; font-size: 28px;">Welcome to Tabadl Alkon!</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Your trusted partner for business success in Saudi Arabia</p>
      </div>

      <!-- Welcome Message -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
        <p style="color: #ffffff; font-size: 18px; margin: 0; line-height: 1.6;">
          Dear ${name},<br><br>
          Welcome to Tabadl Alkon! We're thrilled to have you join our community of successful entrepreneurs and business leaders.
        </p>
      </div>

      <!-- Account Created Successfully -->
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #059669;">
        <h3 style="color: #059669; margin-top: 0; margin-bottom: 15px; font-size: 18px;">✅ Account Successfully Created</h3>
        <p style="color: #374151; margin: 0; line-height: 1.6;">
          Your client account has been successfully created and is ready to use. You now have access to our comprehensive business services platform.
        </p>
      </div>

      <!-- What You Can Do -->
      <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
        <h3 style="color: #111827; margin-top: 0; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px;">
          What You Can Do Now
        </h3>
        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Track Applications:</strong> Monitor your business registration applications in real-time</li>
          <li><strong>Manage Documents:</strong> Upload, organize, and track all your business documents</li>
          <li><strong>View Timeline:</strong> See the complete timeline of your business setup process</li>
          <li><strong>Get Support:</strong> Access our dedicated support team for any questions</li>
          <li><strong>Stay Updated:</strong> Receive notifications about your application status</li>
        </ul>
      </div>

      <!-- Next Steps -->
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #0369a1;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Your Next Steps</h3>
        <ol style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Log in to your account using your email and password</li>
          <li>Complete your profile information for better service</li>
          <li>Start your first business application or consultation request</li>
          <li>Explore our services and resources</li>
        </ol>
      </div>

      <!-- Our Services -->
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
        <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Our Comprehensive Services</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; color: #374151;">
          <div>
            <strong>🏢 Business Registration</strong><br>
            <span style="font-size: 14px;">Company formation and licensing</span>
          </div>
          <div>
            <strong>📋 Legal Compliance</strong><br>
            <span style="font-size: 14px;">Regulatory compliance and documentation</span>
          </div>
          <div>
            <strong>💼 Tax Services</strong><br>
            <span style="font-size: 14px;">Tax registration and filing</span>
          </div>
          <div>
            <strong>🛂 Visa Services</strong><br>
            <span style="font-size: 14px;">Work permits and visa processing</span>
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
        <h3 style="color: #111827; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Need Help Getting Started?</h3>
        <p style="color: #6b7280; margin: 0 0 15px 0;">Our expert team is here to guide you every step of the way:</p>
        <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
          <div>
            <p style="color: #059669; margin: 5px 0; font-weight: 600;">📧 Email: ${contactEmail}</p>
          </div>
          <div>
            <p style="color: #059669; margin: 5px 0; font-weight: 600;">📞 Phone: ${contactPhone}</p>
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tabadlalkon.com'}/login" 
           style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Access Your Dashboard
        </a>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Thank you for choosing Tabadl Alkon for your business needs.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
          &copy; ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
        </p>
      </div>
    </div>
  `

  // Replace placeholders
  htmlBody = htmlBody.replace(/\{name\}/g, name)

  const textBody = `
Welcome to Tabadl Alkon!

Dear ${name},

Welcome to Tabadl Alkon! We're thrilled to have you join our community of successful entrepreneurs and business leaders.

✅ ACCOUNT SUCCESSFULLY CREATED
Your client account has been successfully created and is ready to use. You now have access to our comprehensive business services platform.

WHAT YOU CAN DO NOW:
• Track Applications: Monitor your business registration applications in real-time
• Manage Documents: Upload, organize, and track all your business documents
• View Timeline: See the complete timeline of your business setup process
• Get Support: Access our dedicated support team for any questions
• Stay Updated: Receive notifications about your application status

YOUR NEXT STEPS:
1. Log in to your account using your email and password
2. Complete your profile information for better service
3. Start your first business application or consultation request
4. Explore our services and resources

OUR COMPREHENSIVE SERVICES:
🏢 Business Registration - Company formation and licensing
📋 Legal Compliance - Regulatory compliance and documentation
💼 Tax Services - Tax registration and filing
🛂 Visa Services - Work permits and visa processing

NEED HELP GETTING STARTED?
Our expert team is here to guide you every step of the way:
📧 Email: ${contactEmail}
📞 Phone: ${contactPhone}

Access your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://tabadlalkon.com'}/login

Thank you for choosing Tabadl Alkon for your business needs.

© ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject,
    html: htmlBody,
    text: textBody
  })
}

/**
 * Send login credentials to a newly created user account.
 * Password is only delivered via email — never stored or shown in the admin panel.
 */
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

  const subject = 'Your Tabadl Alkon Account Credentials'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0B6B37; margin-bottom: 8px;">Welcome to Tabadl Alkon</h2>
      <p style="color: #374151;">Dear ${name},</p>
      <p style="color: #374151;">Your ${roleLabel} account has been created. Use the credentials below to sign in:</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${password}</code></p>
      </div>
      <p style="color: #374151;">For security, please change your password after your first login.</p>
      <p><a href="${portalUrl}" style="display:inline-block;background:#0B6B37;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Sign In</a></p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">If you did not expect this email, please contact your administrator.</p>
    </div>
  `
  const text = `Welcome to Tabadl Alkon\n\nEmail: ${to}\nTemporary Password: ${password}\n\nSign in: ${portalUrl}\n\nPlease change your password after first login.`

  return sendEmail({ to, subject, html, text })
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(
  to: string, 
  title: string, 
  message: string, 
  actionUrl?: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0369a1;">${title}</h2>
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #374151; margin: 0;">${message}</p>
      </div>
      ${actionUrl ? `
        <div style="margin: 20px 0;">
          <a href="${actionUrl}" 
             style="background-color: #0369a1; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            View Details
          </a>
        </div>
      ` : ''}
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This is an automated notification from Tabadl Alkon CRM.
      </p>
    </div>
  `

  return sendEmail({
    to,
    subject: title,
    html,
    text: message
  })
}

/**
 * Send business consultation confirmation email
 */
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
  const subject = 'Thank You for Your Business Consultation Request - Tabadl Alkon'
  
  // Get contact information from database (email settings)
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
    // Fall back to defaults if database query fails
  }
  
  // Format business types
  const businessTypesList = formData.businessTypes.map(type => `• ${type}`).join('<br>')
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #059669;">
        <h1 style="color: #059669; margin: 0; font-size: 28px;">Thank You, ${formData.fullName}!</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Your consultation request has been received</p>
      </div>

      <!-- Thank You Message -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
        <p style="color: #ffffff; font-size: 18px; margin: 0; line-height: 1.6;">
          Thank you for your interest in Tabadl Alkon's business services. We have successfully received your consultation request and our team will contact you within 24-48 hours.
        </p>
      </div>

      <!-- Form Details -->
      <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111827; margin-top: 0; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px;">
          Your Submission Details
        </h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600; width: 40%;">Full Name:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.fullName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Email:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Phone:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.phone}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Company Name:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.companyName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Company Type:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.companyType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Designation:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.designation}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Location:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.city}, ${formData.country}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Nature of Business:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.natureOfBusiness}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600; vertical-align: top;">Business Types:</td>
            <td style="padding: 12px 0; color: #111827;">${businessTypesList}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">How did you hear about us:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.howDidYouHear}</td>
          </tr>
        </table>
      </div>

      <!-- Next Steps -->
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #0369a1;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px; font-size: 18px;">What Happens Next?</h3>
        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Our expert team will review your consultation request</li>
          <li>We will contact you within 24-48 hours via email or phone</li>
          <li>We'll schedule a consultation call to discuss your business needs</li>
          <li>You'll receive a customized proposal for our services</li>
        </ul>
      </div>

      <!-- Contact Information -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
        <h3 style="color: #111827; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Need Immediate Assistance?</h3>
        <p style="color: #6b7280; margin: 0 0 10px 0;">Feel free to reach out to us:</p>
        <p style="color: #059669; margin: 5px 0; font-weight: 600;">Email: ${contactEmail}</p>
        <p style="color: #059669; margin: 5px 0; font-weight: 600;">Phone: ${contactPhone}</p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          This is an automated confirmation email. Please do not reply to this email.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
          &copy; ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
        </p>
      </div>
    </div>
  `

  const text = `
Thank You, ${formData.fullName}!

Your consultation request has been received.

Thank you for your interest in Tabadl Alkon's business services. We have successfully received your consultation request and our team will contact you within 24-48 hours.

YOUR SUBMISSION DETAILS:
- Full Name: ${formData.fullName}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Company Name: ${formData.companyName}
- Company Type: ${formData.companyType}
- Designation: ${formData.designation}
- Location: ${formData.city}, ${formData.country}
- Nature of Business: ${formData.natureOfBusiness}
- Business Types: ${formData.businessTypes.join(', ')}
- How did you hear about us: ${formData.howDidYouHear}

WHAT HAPPENS NEXT?
- Our expert team will review your consultation request
- We will contact you within 24-48 hours via email or phone
- We'll schedule a consultation call to discuss your business needs
- You'll receive a customized proposal for our services

NEED IMMEDIATE ASSISTANCE?
Email: ${contactEmail}
Phone: ${contactPhone}

This is an automated confirmation email. Please do not reply to this email.

© ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject,
    html,
    text
  })
}

/**
 * Send business consultation form submission notification to staff/recipients
 */
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
  // Get staff email addresses from database (email settings)
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
        console.error('Error parsing business consultation recipients:', parseError)
        // Try comma-separated string as fallback
        if (typeof settings.businessConsultationRecipients === 'string') {
          staffEmails = settings.businessConsultationRecipients.split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching staff email addresses from settings:', error)
    // Fall back to default if database query fails
    staffEmails = []
  }

  // If no recipient emails configured, log warning and return
  if (!staffEmails || staffEmails.length === 0) {
    console.warn('[Email] No business consultation recipients configured in email settings')
    console.warn('[Email] Configure recipients in Email Settings: businessConsultationRecipients field')
    return { success: false, message: 'No business consultation recipients configured' }
  }

  const subject = `New Business Consultation Request - ${formData.fullName}`
  
  // Format business types
  const businessTypesList = formData.businessTypes.length > 0 
    ? formData.businessTypes.map(type => `• ${type}`).join('<br>')
    : 'Not specified'
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626;">
        <h1 style="color: #dc2626; margin: 0; font-size: 28px;">New Consultation Request</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">A new business consultation form has been submitted</p>
      </div>

      <!-- Alert -->
      <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
        <p style="color: #ffffff; font-size: 18px; margin: 0; line-height: 1.6;">
          <strong>${formData.fullName}</strong> has submitted a new business consultation request. Please review the details below and contact them within 24-48 hours.
        </p>
      </div>

      <!-- Form Details -->
      <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111827; margin-top: 0; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
          Submission Details
        </h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600; width: 40%;">Full Name:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.fullName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Email:</td>
            <td style="padding: 12px 0; color: #111827;"><a href="mailto:${formData.email}" style="color: #dc2626; text-decoration: none;">${formData.email}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Phone:</td>
            <td style="padding: 12px 0; color: #111827;"><a href="tel:${formData.phone}" style="color: #dc2626; text-decoration: none;">${formData.phone}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Company Name:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.companyName || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Company Type:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.companyType || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Designation:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.designation || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Location:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.city}, ${formData.country}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">Nature of Business:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.natureOfBusiness || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600; vertical-align: top;">Business Types:</td>
            <td style="padding: 12px 0; color: #111827;">${businessTypesList}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #6b7280; font-weight: 600;">How did you hear about us:</td>
            <td style="padding: 12px 0; color: #111827;">${formData.howDidYouHear || 'Not provided'}</td>
          </tr>
        </table>
      </div>

      <!-- Action Required -->
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #dc2626;">
        <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Action Required</h3>
        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Contact <strong>${formData.fullName}</strong> within 24-48 hours</li>
          <li>Review their business requirements</li>
          <li>Schedule a consultation call if needed</li>
          <li>Create a lead in the CRM system</li>
        </ul>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          This is an automated notification from Tabadl Alkon CRM.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
          &copy; ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
        </p>
      </div>
    </div>
  `

  const text = `
New Business Consultation Request

${formData.fullName} has submitted a new business consultation request.

SUBMISSION DETAILS:
- Full Name: ${formData.fullName}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Company Name: ${formData.companyName || 'Not provided'}
- Company Type: ${formData.companyType || 'Not provided'}
- Designation: ${formData.designation || 'Not provided'}
- Location: ${formData.city}, ${formData.country}
- Nature of Business: ${formData.natureOfBusiness || 'Not provided'}
- Business Types: ${formData.businessTypes.join(', ') || 'Not specified'}
- How did you hear about us: ${formData.howDidYouHear || 'Not provided'}

ACTION REQUIRED:
- Contact ${formData.fullName} within 24-48 hours
- Review their business requirements
- Schedule a consultation call if needed
- Create a lead in the CRM system

This is an automated notification from Tabadl Alkon CRM.

© ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
  `.trim()

  // Send email to each staff member
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

/**
 * Verify email configuration and SMTP connection using robust approach
 */
export async function verifyEmailConfiguration() {
  const config = await getEmailConfig()
  if (!config) {
    const error = 'Email configuration not found'
    return { success: false, message: error }
  }

  const transportCandidates = createTransportCandidates(config)
  let lastError: any = null

  // Try each transport candidate until one succeeds
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
      // If this isn't the last candidate, continue to next one
      if (i < transportCandidates.length - 1) {
        continue
      }
    }
  }

  // All transport candidates failed
  const errorMessage = `All email transport verification attempts failed. Last error: ${lastError ? String(lastError) : 'Unknown error'}`
  
  return { 
    success: false, 
    message: errorMessage 
  }
}

/**
 * Send a test email using form data (for admin panel testing)
 * This function uses the provided form configuration instead of database
 */
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

The robust email system includes:
- Dual SMTP configuration (465 SSL + 587 STARTTLS)
- Automatic fallback between transport methods
- Enhanced error handling and logging
- Production-ready security settings

Configuration used:
- Host: ${formData.host}
- Port: ${formData.port}
- Encryption: ${formData.encryption}
- From: ${formData.fromAddress}

If you receive this email, your form configuration is working correctly!

Sent at: ${new Date().toISOString()}

Best regards,
Tabadl Alkon CRM System`

  // Extract domain from fromAddress for proper message ID
  const fromAddress = formData.fromAddress || formData.username || 'request@tk.sa'
  const fromDomain = fromAddress.split('@')[1] || 'tk.sa'
  
  const mailOptions = {
    from: fromAddress,  // Use exact email like test.js
    to: to,
    subject: `Test Email from Tabadl Alkon CRM - ${new Date().toLocaleString()}`,
    text: testMessage || defaultMessage,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #059669; text-align: center;">Test Email from Tabadl Alkon CRM</h2>
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
      </div>
    `,
    envelope: {
      from: fromAddress,
      to: to
    },
    // Set message ID with proper domain like test.js
    messageId: `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${fromDomain}>`
  }

  // Create transport candidates using FORM DATA
  const isProduction = process.env.NODE_ENV === 'production'
  
  const transportCandidates = [
    {
      // SSL/TLS (implicit) - port 465
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
      connectionTimeout: 30_000,
      greetingTimeout: 10_000,
    },
    {
      // STARTTLS (explicit) - port 587
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
      connectionTimeout: 30_000,
      greetingTimeout: 10_000,
    },
    {
      // Fallback to configured port from form
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
      connectionTimeout: 30_000,
      greetingTimeout: 10_000,
    }
  ]

  // Try each transport candidate until one succeeds
  let lastError = null

  for (let i = 0; i < transportCandidates.length; i++) {
    const candidate = transportCandidates[i]
    try {
      const transporter = nodemailer.createTransport(candidate as any)

      // Verify connection/auth first
      await transporter.verify()

      // Send the email
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
      // If this isn't the last candidate, continue to next one
      if (i < transportCandidates.length - 1) {
        continue
      }
    }
  }

  // All transport candidates failed
  const errorMessage = `All email transport attempts failed. Last error: ${lastError ? String(lastError) : 'Unknown error'}`
  console.error('[Email] Test email failed:', errorMessage)
  
  return {
    success: false,
    error: errorMessage
  }
}

/**
 * ============================================================
 * 🆕 NEW: Send Password Change Alert Email
 * ============================================================
 * This function sends an email notification when a user changes their password.
 * It's called from both admin and client password change APIs.
 */
export async function sendPasswordChangeEmail(to: string, name: string): Promise<EmailResult> {
  const subject = '🔒 Password Changed Successfully - Tabadl Alkon'
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626;">
        <h1 style="color: #dc2626; margin: 0; font-size: 28px;">🔒 Password Changed</h1>
        <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Your Tabadl Alkon account password has been updated</p>
      </div>

      <!-- Alert Message -->
      <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
        <p style="color: #ffffff; font-size: 18px; margin: 0; line-height: 1.6;">
          Dear ${name},<br><br>
          Your password has been successfully changed on <strong>${new Date().toLocaleString()}</strong>.
        </p>
      </div>

      <!-- Security Warning -->
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #dc2626;">
        <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 15px; font-size: 18px;">⚠️ Important Security Notice</h3>
        <p style="color: #374151; margin: 0 0 15px 0; line-height: 1.6;">
          <strong>If you did not request this password change:</strong>
        </p>
        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Immediately contact our support team</li>
          <li>Check your account for any suspicious activity</li>
          <li>Consider enabling two-factor authentication</li>
        </ul>
      </div>

      <!-- What To Do -->
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #059669;">
        <h3 style="color: #059669; margin-top: 0; margin-bottom: 15px; font-size: 18px;">✅ If You Made This Change</h3>
        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>You can safely ignore this email</li>
          <li>Your account remains secure with your new password</li>
          <li>No further action is required</li>
        </ul>
      </div>

      <!-- Security Tips -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
        <h3 style="color: #111827; margin-top: 0; margin-bottom: 15px; font-size: 18px;">🛡️ Password Security Tips</h3>
        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Use a unique password that you don't use elsewhere</li>
          <li>Make it at least 8 characters with mix of letters, numbers, and symbols</li>
          <li>Change your password regularly (every 3-6 months)</li>
          <li>Never share your password with anyone</li>
          <li>Enable two-factor authentication for extra security</li>
        </ul>
      </div>

      <!-- Support Contact -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
        <h3 style="color: #111827; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Need Help?</h3>
        <p style="color: #6b7280; margin: 0 0 10px 0;">If you have any concerns or need assistance:</p>
        <p style="color: #059669; margin: 5px 0; font-weight: 600;">📧 support@tabadlalkon.com</p>
        <p style="color: #059669; margin: 5px 0; font-weight: 600;">📞 +966 50 000 0000</p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          This is an automated notification from Tabadl Alkon CRM.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
          &copy; ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
        </p>
      </div>
    </div>
  `

  const text = `
🔒 PASSWORD CHANGED SUCCESSFULLY

Dear ${name},

Your password has been successfully changed on ${new Date().toLocaleString()}.

⚠️ IMPORTANT SECURITY NOTICE:
If you did not request this password change:
- Immediately contact our support team
- Check your account for any suspicious activity
- Consider enabling two-factor authentication

✅ If You Made This Change:
- You can safely ignore this email
- Your account remains secure with your new password
- No further action is required

🛡️ PASSWORD SECURITY TIPS:
- Use a unique password that you don't use elsewhere
- Make it at least 8 characters with mix of letters, numbers, and symbols
- Change your password regularly (every 3-6 months)
- Never share your password with anyone
- Enable two-factor authentication for extra security

NEED HELP?
📧 support@tabadlalkon.com
📞 +966 50 000 0000

This is an automated notification from Tabadl Alkon CRM.

© ${new Date().getFullYear()} Tabadl Alkon. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject,
    html,
    text
  })
}