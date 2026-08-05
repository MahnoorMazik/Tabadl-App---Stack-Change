import { NextRequest, NextResponse } from "next/server";
import { sendApplicationStatusEmail, ApplicationEmailPayload } from "@/lib/email/application-email-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = body as ApplicationEmailPayload;

    const result = await sendApplicationStatusEmail(payload);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send email",
      },
      {
        status: 500,
      }
    );
  }
}
