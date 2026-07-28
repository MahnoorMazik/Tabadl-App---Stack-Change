/**
 * WhatsApp Business API Integration
 * Handles WhatsApp message template creation and sending
 */

import { db } from './db'

// Helper to strip quotes from env vars (Docker sometimes includes them)
function stripQuotes(value: string | undefined, defaultValue: string): string {
  if (!value) return defaultValue
  // Remove surrounding quotes if they exist
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return value.trim() || defaultValue
}

/**
 * Get WhatsApp configuration from database with fallback to environment variables
 */
async function getWhatsAppConfig() {
  try {
    const emailSettings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // Get values from database first, then fallback to env vars only if database has no record
    // This allows env vars to be used for deployment, but admin panel takes precedence
    const accessToken = emailSettings?.whatsappAccessToken || 
                       (emailSettings === null ? stripQuotes(process.env.WHATSAPP_ACCESS_TOKEN, '') : '')
    
    const apiVersion = emailSettings?.whatsappApiVersion || 
                      (emailSettings === null ? stripQuotes(process.env.WHATSAPP_API_VERSION, '') : '')
    
    const phoneNumberId = emailSettings?.whatsappPhoneNumberId || 
                         (emailSettings === null ? stripQuotes(process.env.WHATSAPP_PHONE_NUMBER_ID, '') : '')

    return {
      accessToken,
      apiVersion,
      phoneNumberId
    }
  } catch (error) {
    console.error('[WhatsApp] Error fetching config from database, using env vars:', error)
    // Fallback to environment variables only if database query fails (for deployment scenarios)
    return {
      accessToken: stripQuotes(process.env.WHATSAPP_ACCESS_TOKEN, ''),
      apiVersion: stripQuotes(process.env.WHATSAPP_API_VERSION, ''),
      phoneNumberId: stripQuotes(process.env.WHATSAPP_PHONE_NUMBER_ID, '')
    }
  }
}

export interface SendTemplateMessageParams {
  to: string // Phone number in international format (e.g., "923189108310")
  templateName: string
  languageCode?: string
  parameters: string[] // For positional parameters (body parameters)
  accessToken: string
  documentHeader?: {
    link: string
    filename: string
  }
}

/**
 * Send a WhatsApp template message
 */
export async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  languageCode = 'en',
  parameters,
  accessToken: providedAccessToken,
  documentHeader,
}: SendTemplateMessageParams) {
  // Get WhatsApp configuration from database or env vars
  const config = await getWhatsAppConfig()
  
  // Use provided access token if available, otherwise use from config
  const accessToken = providedAccessToken || config.accessToken
  const apiVersion = config.apiVersion
  const phoneNumberId = config.phoneNumberId
  
  if (!accessToken) {
    throw new Error('WhatsApp access token is required. Please configure it in Admin → Settings → Email Settings → WhatsApp Notifications Configuration')
  }
  
  if (!phoneNumberId) {
    throw new Error('WhatsApp phone number ID is required. Please configure it in Admin → Settings → Email Settings → WhatsApp Notifications Configuration')
  }
  
  if (!apiVersion) {
    throw new Error('WhatsApp API version is required. Please configure it in Admin → Settings → Email Settings → WhatsApp Notifications Configuration')
  }
  
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  const components: any[] = []

  // Add header component if document is provided
  if (documentHeader) {
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: {
            link: documentHeader.link,
            filename: documentHeader.filename,
          },
        },
      ],
    })
  }

  // Add body component with parameters
  components.push({
    type: 'body',
    parameters: parameters.map((param) => ({
      type: 'text',
      text: param,
    })),
  })

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  }

  try {
    console.log('[WhatsApp] Sending message:', {
      to: to.substring(0, 4) + '***',
      templateName,
      phoneNumberId,
      hasAccessToken: !!accessToken && accessToken.length > 0,
      accessTokenPrefix: accessToken ? accessToken.substring(0, 10) + '...' : 'not set',
      url,
      nodeEnv: process.env.NODE_ENV
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[WhatsApp] API error response:', {
        status: response.status,
        statusText: response.statusText,
        statusCode: response.status,
        error: data.error || data,
        fullResponse: JSON.stringify(data),
        url,
        requestBody: JSON.stringify(body).substring(0, 200) + '...'
      })
      throw new Error(
        `WhatsApp API error (${response.status}): ${data.error?.message || data.error?.error_user_msg || JSON.stringify(data)}`
      )
    }

    console.log('[WhatsApp] Message sent successfully:', {
      messageId: data.messages?.[0]?.id,
      templateName,
      response: JSON.stringify(data).substring(0, 200)
    })

    return data
  } catch (error: any) {
    console.error('[WhatsApp] Failed to send template message:', {
      error: error?.message || error,
      stack: error?.stack,
      templateName,
      to: to.substring(0, 4) + '***',
      url,
      nodeEnv: process.env.NODE_ENV,
      hasAccessToken: !!accessToken && accessToken.length > 0
    })
    throw error
  }
}

