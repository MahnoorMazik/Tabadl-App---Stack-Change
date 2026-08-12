import { NextRequest, NextResponse } from 'next/server';
import { sendApplicationStatusWhatsApp } from '@/lib/whatsapp/application-whatsapp';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    const { applicationNumber, applicationId, status, recipientPhone, serviceName, adminNotes } = body;

    // Validate required fields
    if (!applicationNumber && !applicationId) {
      return NextResponse.json(
        { error: 'applicationNumber or applicationId is required' },
        { status: 400 }
      );
    }

    // Call the WhatsApp service
    const result = await sendApplicationStatusWhatsApp({
      applicationNumber,
      applicationId,
      status: status || 'SUBMITTED',
      recipientPhone,
      serviceName,
      adminNotes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('WhatsApp test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Test API is working (no auth required for testing)',
    usage: {
      method: 'POST',
      body: {
        applicationNumber: 'APP-2',
        status: 'SUBMITTED | IN_PROGRESS | UNDER_REVIEW | HARD_COPY_REQUIRED | APPROVED | REJECTED | COMPLETED',
        recipientPhone: '+923001234567 (optional)',
        serviceName: 'CR Registration (optional)',
        adminNotes: 'Notes (optional)'
      }
    }
  });
}