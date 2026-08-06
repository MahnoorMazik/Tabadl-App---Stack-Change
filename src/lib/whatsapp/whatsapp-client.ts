export interface WhatsAppMessagePayload {
  to: string;
  message: string;
  type?: string;
  mediaUrl?: string;
}

export async function sendWhatsAppMessage(
  payload: WhatsAppMessagePayload
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // 🔥 READ FROM .env - NOT DATABASE
    const enabled = process.env.WHATSAPP_ENABLED === 'true';
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    console.log('📱 WhatsApp Config Check:');
    console.log('   Enabled:', enabled);
    console.log('   Access Token:', accessToken ? '✅ Present' : '❌ Missing');
    console.log('   Phone Number ID:', phoneNumberId ? '✅ Present' : '❌ Missing');

    // Check if WhatsApp is enabled
    if (!enabled) {
      console.log('❌ WhatsApp is disabled in .env');
      return {
        success: false,
        error: 'WhatsApp notifications are not enabled',
      };
    }

    // Check if credentials are configured
    if (!accessToken || !phoneNumberId) {
      console.error('❌ WhatsApp credentials missing in .env');
      return {
        success: false,
        error: 'WhatsApp API credentials are not configured',
      };
    }

    // 📱 TEST MODE: If using test token, log instead of sending
    if (accessToken === 'test_token' || accessToken === 'test' || accessToken.startsWith('test_')) {
      console.log('📱 WHATSAPP TEST MODE:');
      console.log('   To:', payload.to);
      console.log('   Type:', payload.type || 'text');
      console.log('   Message:', payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : ''));
      console.log('   ✅ Would send successfully');
      
      return {
        success: true,
        messageId: `test_${Date.now()}`,
      };
    }

    // WhatsApp Cloud API expects digits only (no +)
    const to = payload.to.replace(/\D/g, '').replace(/^0+/, '')

    // WhatsApp Business API endpoint
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const requestBody = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: payload.message,
        preview_url: false,
      },
    };

    console.log('📱 Sending WhatsApp to:', to)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiMessage = data.error?.message || 'Failed to send WhatsApp message'
      const apiCode = data.error?.code
      console.error('WhatsApp API Error:', { code: apiCode, message: apiMessage, type: data.error?.type })

      // Common Meta errors
      if (apiCode === 190 || response.status === 401) {
        return {
          success: false,
          error: 'WhatsApp access token is invalid or expired. Update WHATSAPP_ACCESS_TOKEN in .env',
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
      };
    }

    console.log('✅ WhatsApp message sent successfully:', data.messages?.[0]?.id);
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
    };
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
    const enabled = process.env.WHATSAPP_ENABLED === 'true';
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    if (!enabled) {
      return {
        success: false,
        error: 'WhatsApp notifications are not enabled',
      };
    }

    if (!accessToken || !phoneNumberId) {
      return {
        success: false,
        error: 'WhatsApp API credentials are not configured',
      };
    }

    if (accessToken === 'test_token' || accessToken === 'test') {
      console.log('📱 WHATSAPP TEST MODE (Template):');
      console.log('   To:', payload.to);
      console.log('   Template:', payload.templateName);
      console.log('   ✅ Would send successfully');
      
      return {
        success: true,
        messageId: `test_${Date.now()}`,
      };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

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
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp Template API Error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp template message',
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('WhatsApp template send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp template message',
    };
  }
}