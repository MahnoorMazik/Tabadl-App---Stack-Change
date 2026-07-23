import { NextResponse } from 'next/server'
import { getPublicChatbotConfig } from '@/lib/chatbot/settings'

export async function GET() {
  const config = await getPublicChatbotConfig()
  return NextResponse.json(config)
}
