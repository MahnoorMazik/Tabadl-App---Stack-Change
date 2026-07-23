import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { validateEmail } from '@/lib/email-validation'
import { sendConsultationConfirmationEmail, sendConsultationStaffNotificationEmail } from '@/lib/email'
import { normalizePhone } from '@/lib/phone-normalization'
import { createErrorResponse, createSuccessResponse, getRequestId, logError, ErrorCodes, getErrorSuggestion } from '@/lib/error-handler'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp'
import { addCorsHeaders } from '@/lib/cors'

const consultationSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.union([z.string().email('Invalid email format'), z.literal('')]).optional(),
  phone: z.string().min(1, 'Phone number is required'),
  companyName: z.union([z.string(), z.literal('')]).optional(),
  companyType: z.union([z.string(), z.literal('')]).optional(),
  natureOfBusiness: z.union([z.string(), z.literal('')]).optional(),
  designation: z.union([z.string(), z.literal('')]).optional(),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  howDidYouHear: z.union([z.string(), z.literal('')]).optional(),
  businessTypes: z.array(z.string()).optional(),
})

// POST /api/leads/consultation - Create a lead from Business Consultation Form
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const body = await request.json()
    
    // Validate email format only if provided
    if (body.email && body.email.trim() !== '') {
      const emailValidation = validateEmail(body.email)
      if (!emailValidation.isValid) {
        return addCorsHeaders(createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          emailValidation.error || 'Invalid email format',
          400,
          {
            requestId,
            details: [{
              field: 'email',
              message: emailValidation.error || 'Invalid email format'
            }],
            suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR)
          }
        ))
      }
    }

    // If email belongs to an existing active client/user, block submission
    if (body.email && body.email.trim() !== '') {
      const existingUser = await db.user.findFirst({
        where: {
          email: body.email,
          isDeleted: false,
        },
      })

      if (existingUser) {
        return addCorsHeaders(
          createErrorResponse(
            ErrorCodes.DUPLICATE_RESOURCE,
            'An account with this email already exists. Please log in instead of submitting the form again.',
            409,
            {
              requestId,
              details: [
                {
                  field: 'email',
                  message:
                    'An account with this email already exists. Please log in.',
                },
              ],
              context: {
                duplicate: true,
                type: 'client',
              },
              suggestion:
                'Use the login form with this email, or reset your password if you forgot it.',
            }
          )
        )
      }
    }

    // Validate and normalize phone number for duplicate checking
    if (!body.phone || typeof body.phone !== 'string' || body.phone.trim() === '') {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Phone number is required.',
        400,
        {
          requestId,
          details: [{
            field: 'phone',
            message: 'Phone number is required.'
          }],
          suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR)
        }
      ))
    }
    
    const normalizedPhone = normalizePhone(body.phone)
    
    // Check for existing leads with same email (only if email is provided)
    // Only check non-deleted leads
    const existingEmailLeads = body.email && body.email.trim() !== '' 
      ? await db.lead.findMany({
          where: { 
            email: body.email,
            isDeleted: false // Only check non-deleted leads
          },
          orderBy: { createdAt: 'asc' }
        })
      : []

    // Check for existing leads with same normalized phone number (efficient database query)
    // Only query if normalizedPhone is not empty
    // Only check non-deleted leads
    const existingPhoneLeads = normalizedPhone && normalizedPhone.length > 1 // More than just '+'
      ? await db.lead.findMany({
          where: { 
            normalizedPhone: normalizedPhone,
            isDeleted: false // Only check non-deleted leads
          },
          orderBy: { createdAt: 'asc' }
        })
      : []

    const emailDuplicateCount = existingEmailLeads.length
    const phoneDuplicateCount = existingPhoneLeads.length
    
    let duplicateGroupId: string | null = null
    let isDuplicate = false
    let warningMessage = ''
    let phoneWarningMessage = ''
    let emailWarningMessage = ''

    // Handle email duplicate logic
    if (emailDuplicateCount >= 3) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.DUPLICATE_RESOURCE,
        'You have reached the maximum limit of 3 consultation requests using this email address. Please contact us directly for further assistance.',
        409,
        {
          requestId,
          details: [{
            field: 'email',
            message: 'You have reached the maximum limit of 3 consultation requests using this email address. Please contact us directly for further assistance.'
          }],
          context: {
            duplicate: true,
            maxReached: true
          },
          suggestion: getErrorSuggestion(ErrorCodes.DUPLICATE_RESOURCE)
        }
      ))
    } else if (emailDuplicateCount > 0) {
      isDuplicate = true
      const firstLead = existingEmailLeads[0]
      duplicateGroupId = firstLead.duplicateGroupId ?? firstLead.id
      
      if (emailDuplicateCount === 1) {
        emailWarningMessage = 'Warning: You have already submitted 1 consultation request with this email address. This will be marked as a duplicate.'
      } else if (emailDuplicateCount === 2) {
        emailWarningMessage = 'Warning: You have already submitted 2 consultation requests with this email address. This will be your final submission.'
      }
    }

    // Handle phone duplicate logic (separate from email)
    // Only check phone duplicates if we have a valid normalized phone
    if (normalizedPhone && normalizedPhone.length > 1 && phoneDuplicateCount >= 3) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.DUPLICATE_RESOURCE,
        'You have reached the maximum limit of 3 consultation requests using this phone number. Please contact us directly for further assistance.',
        409,
        {
          requestId,
          details: [{
            field: 'phone',
            message: 'You have reached the maximum limit of 3 consultation requests using this phone number. Please contact us directly for further assistance.'
          }],
          context: {
            duplicate: true,
            maxReached: true
          },
          suggestion: getErrorSuggestion(ErrorCodes.DUPLICATE_RESOURCE)
        }
      ))
    } else if (normalizedPhone && normalizedPhone.length > 1 && phoneDuplicateCount > 0) {
      // If phone duplicates exist but email doesn't have a group, use phone-based group
      if (!duplicateGroupId) {
        const firstPhoneLead = existingPhoneLeads[0]
        duplicateGroupId = firstPhoneLead.duplicateGroupId ?? firstPhoneLead.id
      }
      isDuplicate = true
      
      if (phoneDuplicateCount === 1) {
        phoneWarningMessage = 'Warning: You have already submitted 1 consultation request with this phone number. This will be marked as a duplicate.'
      } else if (phoneDuplicateCount === 2) {
        phoneWarningMessage = 'Warning: You have already submitted 2 consultation requests with this phone number. This will be your final submission.'
      }
    }

    // Combine warning messages
    if (emailWarningMessage && phoneWarningMessage) {
      warningMessage = `${emailWarningMessage} ${phoneWarningMessage}`
    } else {
      warningMessage = emailWarningMessage || phoneWarningMessage
    }

    // Determine overall duplicate count (use the higher count)
    const duplicateCount = Math.max(emailDuplicateCount, phoneDuplicateCount)

    // Validate the form data
    const data = consultationSchema.parse(body)

    // Create the lead (store both original and normalized phone)
    // Generate unique lead number (handle race conditions)
    const generateLeadNumber = async (): Promise<string> => {
      // Find all existing lead numbers (including deleted ones)
      // leadNumber has @unique constraint, so we need to check ALL leads
      const existingLeads = await db.lead.findMany({
        select: { leadNumber: true }
      })

      // Extract all numbers and find the maximum
      let maxNumber = 0
      for (const lead of existingLeads) {
        if (lead.leadNumber) {
          const match = lead.leadNumber.match(/LD-(\d+)/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num > maxNumber) {
              maxNumber = num
            }
          }
        }
      }

      // Return next number
      return `LD-${maxNumber + 1}`
    }

    // Retry logic for race condition handling
    let lead
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      try {
        const leadNumber = await generateLeadNumber()

        // Determine default status (prefer "New", otherwise first OPEN type if exists)
        const defaultStatus =
          (await db.leadStatus.findFirst({ where: { name: 'New' } })) ||
          (await db.leadStatus.findFirst({
            where: { type: 'OPEN' },
            orderBy: { createdAt: 'asc' },
          }))
        
        // Only store normalizedPhone if it's valid (more than just '+')
        lead = await db.lead.create({
          data: {
            leadNumber,
            fullName: data.fullName,
            email: data.email || '',
            phone: data.phone, // Store original phone format
            normalizedPhone: normalizedPhone && normalizedPhone.length > 1 ? normalizedPhone : null, // Store normalized phone for duplicate checking
            companyName: data.companyName || null,
            companyType: data.companyType || null,
            natureOfBusiness: data.natureOfBusiness || null,
            designation: data.designation || null,
            country: data.country,
            city: data.city,
            howDidYouHear: data.howDidYouHear || null,
            businessTypes: data.businessTypes && data.businessTypes.length > 0 ? JSON.stringify(data.businessTypes) : null,
            source: 'Business Consultation Form',
            ...(defaultStatus && { statusId: defaultStatus.id }),
            duplicateGroupId: duplicateGroupId,
            isDuplicate: isDuplicate,
            duplicateCount: duplicateCount + 1
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
        })
        
        // Successfully created, break out of retry loop
        break
      } catch (createError: any) {
        // Check if it's a unique constraint violation on leadNumber
        if (createError?.code === 'P2002' && createError?.meta?.target?.includes('leadNumber')) {
          attempts++
          if (attempts >= maxAttempts) {
            // Max retries reached, throw the error
            throw createError
          }
          // Wait a short random time before retrying (helps with race conditions)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
          continue
        }
        // If it's not a leadNumber conflict, throw immediately
        throw createError
      }
    }

    if (!lead) {
      throw new Error('Failed to create lead after multiple attempts')
    }

    // Update all leads in the duplicate group with the new count
    // If both email and phone have duplicates, they might share the same group, 
    // so we update based on the combined duplicate count
    if (duplicateGroupId) {
      // Use the maximum of email or phone duplicate count + 1
      const maxCount = Math.max(emailDuplicateCount, phoneDuplicateCount) + 1
      await db.lead.updateMany({
        where: { duplicateGroupId: duplicateGroupId },
        data: { duplicateCount: maxCount }
      })
    } else if (phoneDuplicateCount > 0 && existingPhoneLeads.length > 0) {
      // If only phone has duplicates, update those specific groups
      const phoneGroupIds = existingPhoneLeads
        .map(lead => lead.duplicateGroupId || lead.id)
        .filter((id, index, self) => self.indexOf(id) === index) // Get unique group IDs
      
      for (const groupId of phoneGroupIds) {
        await db.lead.updateMany({
          where: { duplicateGroupId: groupId },
          data: { duplicateCount: phoneDuplicateCount + 1 }
        })
      }
    }

    // Send confirmation email to client (non-blocking) - only if email is provided and not empty
    const hasValidEmail = data.email && typeof data.email === 'string' && data.email.trim() !== ''
    if (hasValidEmail && data.email) {
      const clientEmail: string = data.email // Type narrowing for TypeScript
      sendConsultationConfirmationEmail(clientEmail, {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName || '',
        companyType: data.companyType || '',
        natureOfBusiness: data.natureOfBusiness || '',
        designation: data.designation || '',
        country: data.country,
        city: data.city,
        howDidYouHear: data.howDidYouHear || '',
        businessTypes: data.businessTypes || []
      }).catch((emailError) => {
        // Log email error but don't fail the request
        console.error('Failed to send consultation confirmation email:', emailError)
        // Email sending failure should not affect the success of lead creation
      })
    }

    // Send notification email to staff/recipients (non-blocking)
    sendConsultationStaffNotificationEmail({
      fullName: data.fullName,
      email: data.email || '',
      phone: data.phone,
      companyName: data.companyName || '',
      companyType: data.companyType || '',
      natureOfBusiness: data.natureOfBusiness || '',
      designation: data.designation || '',
      country: data.country,
      city: data.city,
      howDidYouHear: data.howDidYouHear || '',
      businessTypes: data.businessTypes || []
    }).catch((emailError) => {
      // Log email error but don't fail the request
      console.error('Failed to send consultation notification email to staff:', emailError)
      // Email sending failure should not affect the success of lead creation
    })

    // Send WhatsApp notification (non-blocking)
    // Get contact details and WhatsApp credentials from EmailSettings ONLY
    try {
      const emailSettings = await db.emailSettings.findFirst({
        orderBy: { createdAt: 'desc' }
      })

      // WhatsApp notifications use ONLY database values. If any required credential
      // is missing in the database, we skip sending WhatsApp notifications entirely.
      const finalAccessToken = emailSettings?.whatsappAccessToken || ''
      const finalApiVersion = emailSettings?.whatsappApiVersion || ''
      const finalPhoneNumberId = emailSettings?.whatsappPhoneNumberId || ''
      const documentUrl = emailSettings?.whatsappDocumentUrl || ''

      const isWhatsAppEnabled = !!(finalAccessToken && finalApiVersion && finalPhoneNumberId)
      
      if (!isWhatsAppEnabled) {
        console.log('[WhatsApp] WhatsApp notifications are disabled - required DB fields are not set:', {
          hasAccessToken: !!finalAccessToken,
          hasApiVersion: !!finalApiVersion,
          hasPhoneNumberId: !!finalPhoneNumberId,
          hasEmailSettingsRecord: !!emailSettings,
          hasDocumentUrl: !!documentUrl,
          dbFieldsEmpty: !emailSettings || (!finalAccessToken || !finalApiVersion || !finalPhoneNumberId)
        })
      } else {
        // Strip quotes from final access token
        let formattedWhatsappAccessToken = finalAccessToken
        if (formattedWhatsappAccessToken && 
            ((formattedWhatsappAccessToken.startsWith('"') && formattedWhatsappAccessToken.endsWith('"')) || 
             (formattedWhatsappAccessToken.startsWith("'") && formattedWhatsappAccessToken.endsWith("'")))) {
          formattedWhatsappAccessToken = formattedWhatsappAccessToken.slice(1, -1).trim()
        }
        
        console.log('[WhatsApp] WhatsApp configuration (DB-based):', {
          hasToken: !!formattedWhatsappAccessToken,
          tokenLength: formattedWhatsappAccessToken?.length || 0,
          tokenPrefix: formattedWhatsappAccessToken ? formattedWhatsappAccessToken.substring(0, 10) + '...' : 'not set',
          apiVersion: finalApiVersion,
          phoneNumberId: finalPhoneNumberId,
          documentUrl
        })
        
        const contactPhone = emailSettings?.contactPhone || ''
        const contactEmail = emailSettings?.contactEmail || ''

        // Send WhatsApp notification to client if access token and client phone are available
        if (formattedWhatsappAccessToken && data.phone) {
          console.log('[WhatsApp] Attempting to send client notification:', {
            phone: data.phone.substring(0, 4) + '***',
            hasAccessToken: !!formattedWhatsappAccessToken,
            templateName: 'tk_sa_business_consultation_form_client_notification',
            documentBaseUrl: documentUrl
          })
          
          // Format phone number for WhatsApp API (remove + and spaces)
          const whatsappPhoneNumber = data.phone.replace(/[+\s]/g, '')
          console.log('[WhatsApp] Formatted phone number:', whatsappPhoneNumber.substring(0, 4) + '***')
          
          sendWhatsAppTemplateMessage({
            to: whatsappPhoneNumber,
            templateName: 'tk_sa_business_consultation_form_client_notification',
            languageCode: 'en',
            parameters: [
              data.fullName,           // {{1}} - Client name
              contactPhone,            // {{2}} - Contact phone from email settings
              contactEmail             // {{3}} - Contact email from email settings
            ],
            accessToken: formattedWhatsappAccessToken,
            documentHeader: documentUrl
              ? {
                  link: documentUrl,
                  filename: documentUrl.split('/').pop() || 'document.pdf',
                }
              : undefined,
          }).then(() => {
            console.log('[WhatsApp] Client notification sent successfully')
          }).catch((whatsappError: any) => {
            // Log WhatsApp error but don't fail the request
            console.error('[WhatsApp] Failed to send notification to client:', {
              error: whatsappError?.message || whatsappError,
              stack: whatsappError?.stack,
              phone: data.phone.substring(0, 4) + '***',
              templateName: 'tk_sa_business_consultation_form_client_notification',
              fullError: whatsappError
            })
            // WhatsApp sending failure should not affect the success of lead creation
          })
        } else {
          console.log('[WhatsApp] Skipping client notification:', {
            hasAccessToken: !!formattedWhatsappAccessToken,
            hasPhone: !!data.phone
          })
        }

        // Send WhatsApp notification to staff members
        if (formattedWhatsappAccessToken) {
          console.log('[WhatsApp] Attempting to send staff notifications')
          
          // Safely parse staff phone numbers
          let staffPhoneNumbers: string[] = []
          try {
            if (emailSettings?.staffWhatsAppNumbers) {
              console.log('[WhatsApp] Raw staffWhatsAppNumbers from DB:', emailSettings.staffWhatsAppNumbers)
              staffPhoneNumbers = JSON.parse(emailSettings.staffWhatsAppNumbers)
              console.log('[WhatsApp] Parsed staff phone numbers:', staffPhoneNumbers)
            } else {
              console.log('[WhatsApp] No staffWhatsAppNumbers found in emailSettings')
            }
          } catch (parseError: any) {
            console.error('[WhatsApp] Error parsing staffWhatsAppNumbers:', {
              error: parseError?.message || parseError,
              rawValue: emailSettings?.staffWhatsAppNumbers,
              stack: parseError?.stack
            })
            staffPhoneNumbers = []
          }

          console.log('[WhatsApp] Staff phone numbers:', {
            count: staffPhoneNumbers?.length || 0,
            hasNumbers: Array.isArray(staffPhoneNumbers) && staffPhoneNumbers.length > 0,
            phoneNumbers: staffPhoneNumbers
          })

          // Send notification to each staff member
          if (staffPhoneNumbers && Array.isArray(staffPhoneNumbers) && staffPhoneNumbers.length > 0) {
            console.log('[WhatsApp] Processing', staffPhoneNumbers.length, 'staff phone number(s)')
            
            const staffNotifications = staffPhoneNumbers.map((staffPhone: string, index: number) => {
              // Format phone number for WhatsApp API (remove + and spaces)
              const formattedPhone = staffPhone.replace(/[+\s]/g, '')
              
              console.log(`[WhatsApp] [${index + 1}/${staffPhoneNumbers.length}] Sending staff notification to:`, {
                original: staffPhone.substring(0, 4) + '***',
                formatted: formattedPhone.substring(0, 4) + '***',
                fullFormatted: formattedPhone
              })
              
              return sendWhatsAppTemplateMessage({
                to: formattedPhone,
                templateName: 'tk_sa_business_consultation_form_staff_notification',
                languageCode: 'en',
                parameters: [
                  data.fullName,                           // {{1}} - Client name
                  data.phone || 'N/A',                     // {{2}} - Client phone
                  data.email || 'N/A',                     // {{3}} - Client email
                  data.companyName || 'N/A',               // {{4}} - Company
                  data.natureOfBusiness || 'N/A',         // {{5}} - Nature of Business
                  data.city || 'N/A',                      // {{6}} - City
                  data.country || 'N/A',                   // {{7}} - Country
                ],
                accessToken: formattedWhatsappAccessToken,
              }).then((result) => {
                console.log('[WhatsApp] Staff notification sent successfully to:', {
                  phone: formattedPhone.substring(0, 4) + '***',
                  messageId: result?.messages?.[0]?.id,
                  index: index + 1,
                  total: staffPhoneNumbers.length
                })
                return result
              }).catch((whatsappError: any) => {
                // Log WhatsApp error but don't fail the request
                console.error('[WhatsApp] Failed to send notification to staff:', {
                  staffPhone: formattedPhone.substring(0, 4) + '***',
                  fullFormatted: formattedPhone,
                  error: whatsappError?.message || whatsappError,
                  stack: whatsappError?.stack,
                  templateName: 'tk_sa_business_consultation_form_staff_notification',
                  fullError: whatsappError,
                  index: index + 1,
                  total: staffPhoneNumbers.length
                })
                // WhatsApp sending failure should not affect the success of lead creation
                throw whatsappError // Re-throw so Promise.all can catch it
              })
            })

            // Wait for all staff notifications to complete (non-blocking)
            Promise.all(staffNotifications)
              .then((results) => {
                console.log('[WhatsApp] All staff notifications completed:', {
                  total: staffPhoneNumbers.length,
                  successful: results.filter(r => r).length,
                  failed: staffPhoneNumbers.length - results.filter(r => r).length
                })
              })
              .catch((error) => {
                // Individual errors are already logged, just log summary
                console.error('[WhatsApp] Some staff notifications failed:', {
                  total: staffPhoneNumbers.length,
                  error: error?.message || error
                })
              })
          } else {
            console.log('[WhatsApp] No staff phone numbers to send notifications to')
          }
        } else {
          console.log('[WhatsApp] No access token, skipping staff notifications')
        }
      }
    } catch (whatsappError) {
      // Log WhatsApp error but don't fail the request
      console.error('Error setting up WhatsApp notification:', whatsappError)
    }

    const successMessage = hasValidEmail
      ? 'Thank you for your consultation request! We will get back to you soon. A confirmation email has been sent to your email address.'
      : 'Thank you for your consultation request! We will get back to you soon.'
    
    return addCorsHeaders(createSuccessResponse(
      {
        lead,
        warning: warningMessage,
        isDuplicate: isDuplicate,
        duplicateCount: duplicateCount + 1,
        emailDuplicateCount: emailDuplicateCount + (body.email && body.email.trim() !== '' ? 1 : 0),
        phoneDuplicateCount: phoneDuplicateCount + 1
      },
      201,
      {
        requestId,
        message: successMessage
      }
    ))

  } catch (error: any) {
    console.error('Error creating consultation lead:', error)
    
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      const fieldName = firstError?.path[0] || 'unknown'
      let errorMessage = firstError?.message || 'Validation failed'
      
      // Provide more user-friendly error messages
      if (fieldName === 'fullName') {
        errorMessage = 'Please enter your full name.'
      } else if (fieldName === 'email') {
        errorMessage = 'Please enter a valid email address.'
      } else if (fieldName === 'phone') {
        errorMessage = 'Please enter your phone number.'
      } else if (fieldName === 'companyName') {
        errorMessage = 'Please enter your company name.'
      } else if (fieldName === 'companyType') {
        errorMessage = 'Please enter the type of company.'
      } else if (fieldName === 'natureOfBusiness') {
        errorMessage = 'Please describe your business activities.'
      } else if (fieldName === 'designation') {
        errorMessage = 'Please enter your job title/position.'
      } else if (fieldName === 'country') {
        errorMessage = 'Please enter your country.'
      } else if (fieldName === 'city') {
        errorMessage = 'Please enter your city.'
      } else if (fieldName === 'howDidYouHear') {
        errorMessage = 'Please select how you heard about us.'
      }
      
      const errorDetails: any[] = error.issues.map((issue: any) => ({
        field: issue.path[0] || 'unknown',
        message: issue.message,
        code: issue.code
      }))
      
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        errorMessage,
        400,
        {
          requestId,
          details: errorDetails,
          suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR)
        }
      ))
    }
    
    // Handle Prisma errors
    if (error?.code) {
      console.error('Database error:', error.code, error.message)
      logError(error, {
        code: ErrorCodes.DATABASE_ERROR,
        requestId,
        endpoint: '/api/leads/consultation',
        method: 'POST',
        additionalContext: {
          prismaErrorCode: error.code
        }
      })
      
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Database error occurred. Please try again.',
        500,
        {
          requestId,
          context: {
            code: error.code
          },
          suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
        }
      ))
    }
    
    logError(error instanceof Error ? error : new Error(error?.message || 'Unknown error'), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/leads/consultation',
      method: 'POST'
    })
    
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error?.message || 'Failed to submit consultation request. Please try again.',
      500,
      {
        requestId,
        suggestion: getErrorSuggestion(ErrorCodes.INTERNAL_ERROR)
      }
    ))
  }
}

