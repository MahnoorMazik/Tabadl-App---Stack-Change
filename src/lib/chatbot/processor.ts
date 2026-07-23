import { db } from '@/lib/db'
import { chatWithOllama, type ChatMessage } from '@/lib/chatbot/ollama'
import {
  getChatbotSettings,
  isChannelEnabled,
  type ResolvedChatbotSettings,
} from '@/lib/chatbot/settings'
import {
  BOT_UNAVAILABLE_REPLY,
  extractHumanHandoffIntent,
  HANDOFF_REPLY,
} from '@/lib/chatbot/handoff'
import type { ChatChannel } from '@/lib/chatbot/prompt'
import { getSocketIO } from '@/lib/notifications'

const HISTORY_LIMIT = 16

export type BotProcessResult = {
  reply: string | null
  handedOff: boolean
  botUnavailable: boolean
}

async function getOrCreateConversation(
  visitorId: string,
  channel: ChatChannel,
  visitorName?: string | null,
  visitorEmail?: string | null
) {
  return db.supportConversation.upsert({
    where: { visitorId },
    create: {
      visitorId,
      channel,
      status: 'bot',
      visitorName: visitorName ?? undefined,
      visitorEmail: visitorEmail ?? undefined,
    },
    update: {
      lastMessageAt: new Date(),
      ...(visitorName ? { visitorName } : {}),
      ...(visitorEmail ? { visitorEmail } : {}),
    },
  })
}

async function loadHistory(visitorId: string): Promise<ChatMessage[]> {
  const rows = await db.supportMessage.findMany({
    where: { visitorId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })

  return rows
    .reverse()
    .map((m) => ({
      role: m.isFromVisitor ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
}

async function createBotMessage(visitorId: string, content: string) {
  const message = await db.supportMessage.create({
    data: {
      visitorId,
      content,
      isFromVisitor: false,
      isBot: true,
      status: 'SENT',
    },
  })

  try {
    const io = getSocketIO()
    if (io) {
      const payload = {
        id: message.id,
        visitorId: message.visitorId,
        content: message.content,
        isFromVisitor: false,
        isBot: true,
        status: message.status,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
      }
      io.to(`support-${visitorId}`).emit('support-message', payload)
      io.to('support-staff').emit('support-message', payload)
    }
  } catch (e) {
    console.error('[Chatbot] Socket emit failed:', e)
  }

  return message
}

export async function shouldBotRespond(channel: ChatChannel): Promise<boolean> {
  const settings = await getChatbotSettings()
  if (!settings) return false
  return isChannelEnabled(settings, channel)
}

export async function processVisitorMessage(
  visitorId: string,
  content: string,
  channel: ChatChannel = 'website',
  visitorName?: string | null,
  visitorEmail?: string | null
): Promise<BotProcessResult> {
  const settings = await getChatbotSettings()
  if (!settings || !isChannelEnabled(settings, channel)) {
    return { reply: null, handedOff: false, botUnavailable: false }
  }

  const conversation = await getOrCreateConversation(visitorId, channel, visitorName, visitorEmail)

  if (conversation.status !== 'bot') {
    return { reply: null, handedOff: false, botUnavailable: false }
  }

  if (extractHumanHandoffIntent(content)) {
    await createBotMessage(visitorId, HANDOFF_REPLY)
    await db.supportConversation.update({
      where: { id: conversation.id },
      data: { status: 'human', handedOffAt: new Date(), lastMessageAt: new Date() },
    })
    return { reply: HANDOFF_REPLY, handedOff: true, botUnavailable: false }
  }

  try {
    const reply = await generateBotReply(visitorId, settings)
    await createBotMessage(visitorId, reply)
    await db.supportConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    })
    return { reply, handedOff: false, botUnavailable: false }
  } catch (error) {
    console.error('[Chatbot] Generation failed:', error)
    await createBotMessage(visitorId, BOT_UNAVAILABLE_REPLY)
    await db.supportConversation.update({
      where: { id: conversation.id },
      data: { status: 'human', handedOffAt: new Date(), lastMessageAt: new Date() },
    })
    return { reply: BOT_UNAVAILABLE_REPLY, handedOff: true, botUnavailable: true }
  }
}

async function generateBotReply(
  visitorId: string,
  settings: ResolvedChatbotSettings
): Promise<string> {
  const history = await loadHistory(visitorId)
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${settings.systemPrompt}\n\nYou are "${settings.botName}". Keep answers helpful and concise.`,
    },
    ...history.filter((m) => m.role !== 'system'),
  ]

  const raw = await chatWithOllama(settings, messages)
  return sanitizeReply(raw)
}

function sanitizeReply(text: string): string {
  return text.trim().slice(0, 2000)
}

/** Placeholder for future email channel integration */
export async function processEmailWithChatbot(
  _fromEmail: string,
  _subject: string,
  _body: string
): Promise<string | null> {
  const settings = await getChatbotSettings()
  if (!settings || !isChannelEnabled(settings, 'email')) return null
  // Future: create email-thread conversation and reply via SMTP
  return null
}

/** Placeholder for future WhatsApp channel integration */
export async function processWhatsAppWithChatbot(
  _phone: string,
  _message: string
): Promise<string | null> {
  const settings = await getChatbotSettings()
  if (!settings || !isChannelEnabled(settings, 'whatsapp')) return null
  return null
}
