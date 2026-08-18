import { db } from "@/lib/db";

export interface WhatsAppMessagePayload {
  to: string;
  message: string;
  type?: string;
  mediaUrl?: string;
}

export interface WhatsAppResult {
  success: boolean;
  error?: string;
  messageId?: string;
  to: string;
}

// Get WhatsApp config from database with .env fallback
async function getWhatsAppConfigFromDB() {
  try {
    const settings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        whatsappAccessToken: true,
        whatsappApiVersion: true,
        whatsappPhoneNumberId: true,
        whatsappDocumentUrl: true,
        enableWhatsAppNotifications: true,
        staffWhatsAppNumbers: true,
      }
    })

    // If database config exists, use it
    if (settings) {
      console.log('📱 Using database WhatsApp configuration')
      return {
        accessToken: settings.whatsappAccessToken,
        apiVersion: settings.whatsappApiVersion || 'v21.0',
        phoneNumberId: settings.whatsappPhoneNumberId,
        documentUrl: settings.whatsappDocumentUrl || undefined,
        enabled: settings.enableWhatsAppNotifications ?? true,
        staffNumbers: settings.staffWhatsAppNumbers ? JSON.parse(settings.staffWhatsAppNumbers) : [],
      }
    }

    // Fallback to .env if database config doesn't exist
    console.log('📱 Using fallback .env WhatsApp configuration')
    return {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      documentUrl: process.env.WHATSAPP_DOCUMENT_URL || undefined,
      enabled: process.env.WHATSAPP_ENABLED === 'true',
      staffNumbers: [],
    }
  } catch (error) {
    console.error('Error fetching WhatsApp config from database:', error)
    // Ultimate fallback to .env
    return {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      documentUrl: process.env.WHATSAPP_DOCUMENT_URL || undefined,
      enabled: process.env.WHATSAPP_ENABLED === 'true',
      staffNumbers: [],
    }
  }
}

export async function sendWhatsAppMessage(
  payload: WhatsAppMessagePayload
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // 🔥 READ FROM DATABASE - NOT .env
    const config = await getWhatsAppConfigFromDB()

    console.log('📱 WhatsApp Config Check:')
    console.log('   Source:', config.accessToken === process.env.WHATSAPP_ACCESS_TOKEN ? '.env (fallback)' : 'Database')
    console.log('   Enabled:', config.enabled)
    console.log('   Access Token:', config.accessToken ? '✅ Present' : '❌ Missing')
    console.log('   Phone Number ID:', config.phoneNumberId ? '✅ Present' : '❌ Missing')

    // Check if WhatsApp is enabled
    if (!config.enabled) {
      console.log('❌ WhatsApp is disabled in database')
      return {
        success: false,
        error: 'WhatsApp notifications are not enabled',
      }
    }

    // Check if credentials are configured
    if (!config.accessToken || !config.phoneNumberId) {
      console.error('❌ WhatsApp credentials missing in database')
      return {
        success: false,
        error: 'WhatsApp API credentials are not configured. Please update settings in Admin → Email Settings.',
      }
    }

    // 📱 TEST MODE: If using test token, log instead of sending
    if (config.accessToken === 'test_token' || config.accessToken === 'test' || config.accessToken.startsWith('test_')) {
      console.log('📱 WHATSAPP TEST MODE:')
      console.log('   To:', payload.to)
      console.log('   Type:', payload.type || 'text')
      console.log('   Message:', payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : ''))
      console.log('   ✅ Would send successfully')
      
      return {
        success: true,
        messageId: `test_${Date.now()}`,
      }
    }

    // WhatsApp Cloud API expects digits only (no +)
    const to = payload.to.replace(/\D/g, '').replace(/^0+/, '')

    // WhatsApp Business API endpoint
    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`

    const requestBody = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: payload.message,
        preview_url: false,
      },
    }

    console.log('📱 Sending WhatsApp to:', to)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok) {
      const apiMessage = data.error?.message || 'Failed to send WhatsApp message'
      const apiCode = data.error?.code
      console.error('WhatsApp API Error:', { code: apiCode, message: apiMessage, type: data.error?.type })

      // Common Meta errors
      if (apiCode === 190 || response.status === 401) {
        return {
          success: false,
          error: 'WhatsApp access token is invalid or expired. Update in Admin → Email Settings → WhatsApp Configuration.',
        }
      }
      if (apiCode === 131030 || apiCode === 131047) {
        return {
          success: false,
          error: 'Recipient phone is not allowed / outside 24h window. Use an approved template or add the number to test recipients.',
        }
      }

      return {
        success: false,
        error: apiMessage,
      }
    }

    console.log('✅ WhatsApp message sent successfully:', data.messages?.[0]?.id)
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
    }
  }
}

// Optional: Send template message
export async function sendWhatsAppTemplateMessage(
  payload: {
    to: string;
    templateName: string;
    language: string;
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        image?: { link: string };
        document?: { link: string };
      }>;
    }>;
  }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const config = await getWhatsAppConfigFromDB()

    if (!config.enabled) {
      return {
        success: false,
        error: 'WhatsApp notifications are not enabled',
      }
    }

    if (!config.accessToken || !config.phoneNumberId) {
      return {
        success: false,
        error: 'WhatsApp API credentials are not configured. Please update settings in Admin → Email Settings.',
      }
    }

    if (config.accessToken === 'test_token' || config.accessToken === 'test') {
      console.log('📱 WHATSAPP TEST MODE (Template):')
      console.log('   To:', payload.to)
      console.log('   Template:', payload.templateName)
      console.log('   ✅ Would send successfully')
      
      return {
        success: true,
        messageId: `test_${Date.now()}`,
      }
    }

    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`

    const requestBody = {
      messaging_product: "whatsapp",
      to: payload.to,
      type: "template",
      template: {
        name: payload.templateName,
        language: {
          code: payload.language || "en",
        },
        components: payload.components,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp Template API Error:', data)
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp template message',
      }
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    console.error('WhatsApp template send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp template message',
    }
  }
}

// Get staff WhatsApp numbers from database
export async function getStaffWhatsAppNumbersFromDB(): Promise<string[]> {
  try {
    const settings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        staffWhatsAppNumbers: true,
      }
    })

    if (!settings || !settings.staffWhatsAppNumbers) {
      // Fallback to .env if available
      const envNumbers = process.env.STAFF_WHATSAPP_NUMBERS
      if (envNumbers) {
        return envNumbers.split(',').map(s => s.trim()).filter(Boolean)
      }
      return []
    }

    return JSON.parse(settings.staffWhatsAppNumbers)
  } catch (error) {
    console.error('Error fetching staff WhatsApp numbers:', error)
    return []
  }
}

// Send WhatsApp to all staff members
export async function sendWhatsAppToStaff(
  message: string,
  documentUrl?: string
): Promise<{ success: boolean; results: WhatsAppResult[] }> {
  const staffNumbers = await getStaffWhatsAppNumbersFromDB()
  
  if (staffNumbers.length === 0) {
    return {
      success: false,
      results: [{ 
        to: 'none', 
        success: false, 
        error: 'No staff WhatsApp numbers configured' 
      }],
    }
  }

  const results: WhatsAppResult[] = []
  
  for (const number of staffNumbers) {
    const result = await sendWhatsAppMessage({
      to: number,
      message,
      type: 'staff_notification',
    })
    
    results.push({ 
      to: number, 
      success: result.success, 
      error: result.error,
      messageId: result.messageId 
    })
  }

  const allSuccess = results.every(r => r.success)
  return {
    success: allSuccess,
    results,
  }
}