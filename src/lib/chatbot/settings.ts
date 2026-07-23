import { db } from '@/lib/db'
import { DEFAULT_CRM_BOT_PROMPT, type ChatChannel } from '@/lib/chatbot/prompt'
import { z } from 'zod'

const DEFAULTS = {
  ollamaHost: 'https://ollama.com',
  ollamaModel: 'qwen3:8b-cloud',
  temperature: 0.7,
  botName: 'TK Assistant',
}

export interface ResolvedChatbotSettings {
  enabled: boolean
  enabledWebsiteChat: boolean
  enabledWhatsApp: boolean
  enabledEmail: boolean
  botName: string
  ollamaApiKey: string
  ollamaHost: string
  ollamaModel: string
  temperature: number
  systemPrompt: string
}

export interface ChatbotSettingsAdminDto {
  enabled: boolean
  enabledWebsiteChat: boolean
  enabledWhatsApp: boolean
  enabledEmail: boolean
  botName: string
  ollamaHost: string
  ollamaModel: string
  temperature: number
  systemPrompt: string
  hasOllamaApiKey: boolean
  ollamaApiKeyHint: string | null
  botConfigured: boolean
}

export const chatbotSettingsSchema = z.object({
  enabled: z.boolean(),
  enabledWebsiteChat: z.boolean(),
  enabledWhatsApp: z.boolean(),
  enabledEmail: z.boolean(),
  botName: z.string().min(1).max(64),
  ollamaApiKey: z.string().optional(),
  ollamaHost: z.string().url().or(z.literal('')),
  ollamaModel: z.string().min(1),
  temperature: z.number().min(0).max(1.5),
  systemPrompt: z.string().min(10),
})

function keyHint(key: string): string | null {
  const trimmed = key.trim()
  if (trimmed.length < 4) return null
  return `••••${trimmed.slice(-4)}`
}

function resolveOllamaApiKey(stored: string | null | undefined): string {
  return stored?.trim() || process.env.OLLAMA_API_KEY?.trim() || ''
}

function toResolved(row: {
  enabled: boolean
  enabledWebsiteChat: boolean
  enabledWhatsApp: boolean
  enabledEmail: boolean
  botName: string
  ollamaApiKey: string | null
  ollamaHost: string
  ollamaModel: string
  temperature: number
  systemPrompt: string | null
}): ResolvedChatbotSettings | null {
  const ollamaApiKey = resolveOllamaApiKey(row.ollamaApiKey)
  if (!row.enabled || !ollamaApiKey) return null

  return {
    enabled: row.enabled,
    enabledWebsiteChat: row.enabledWebsiteChat,
    enabledWhatsApp: row.enabledWhatsApp,
    enabledEmail: row.enabledEmail,
    botName: row.botName || DEFAULTS.botName,
    ollamaApiKey,
    ollamaHost: row.ollamaHost?.trim() || process.env.OLLAMA_HOST?.trim() || DEFAULTS.ollamaHost,
    ollamaModel: row.ollamaModel?.trim() || process.env.OLLAMA_MODEL?.trim() || DEFAULTS.ollamaModel,
    temperature:
      typeof row.temperature === 'number'
        ? row.temperature
        : parseFloat(process.env.OLLAMA_TEMPERATURE ?? String(DEFAULTS.temperature)) || DEFAULTS.temperature,
    systemPrompt:
      row.systemPrompt?.trim() ||
      process.env.CHATBOT_SYSTEM_PROMPT?.replace(/\\n/g, '\n') ||
      DEFAULT_CRM_BOT_PROMPT,
  }
}

async function getOrCreateRow() {
  const existing = await db.chatbotSettings.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (existing) return existing

  return db.chatbotSettings.create({
    data: {
      enabled: false,
      enabledWebsiteChat: false,
      enabledWhatsApp: false,
      enabledEmail: false,
      botName: DEFAULTS.botName,
      ollamaHost: process.env.OLLAMA_HOST?.trim() || DEFAULTS.ollamaHost,
      ollamaModel: process.env.OLLAMA_MODEL?.trim() || DEFAULTS.ollamaModel,
      temperature: DEFAULTS.temperature,
      systemPrompt: DEFAULT_CRM_BOT_PROMPT,
    },
  })
}

export async function getChatbotSettings(): Promise<ResolvedChatbotSettings | null> {
  const row = await db.chatbotSettings.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!row) return null
  return toResolved(row)
}

export function isChannelEnabled(settings: ResolvedChatbotSettings, channel: ChatChannel): boolean {
  switch (channel) {
    case 'website':
      return settings.enabledWebsiteChat
    case 'whatsapp':
      return settings.enabledWhatsApp
    case 'email':
      return settings.enabledEmail
    default:
      return false
  }
}

export async function getChatbotSettingsForAdmin(): Promise<ChatbotSettingsAdminDto> {
  const row = await getOrCreateRow()
  const ollamaApiKey = resolveOllamaApiKey(row.ollamaApiKey)
  const resolved = toResolved(row)

  return {
    enabled: row.enabled,
    enabledWebsiteChat: row.enabledWebsiteChat,
    enabledWhatsApp: row.enabledWhatsApp,
    enabledEmail: row.enabledEmail,
    botName: row.botName,
    ollamaHost: row.ollamaHost,
    ollamaModel: row.ollamaModel,
    temperature: row.temperature,
    systemPrompt: row.systemPrompt || DEFAULT_CRM_BOT_PROMPT,
    hasOllamaApiKey: Boolean(ollamaApiKey),
    ollamaApiKeyHint: keyHint(ollamaApiKey),
    botConfigured: Boolean(resolved),
  }
}

export async function saveChatbotSettings(
  input: z.infer<typeof chatbotSettingsSchema>
): Promise<ChatbotSettingsAdminDto> {
  const existing = await getOrCreateRow()

  const ollamaApiKey =
    input.ollamaApiKey && input.ollamaApiKey.trim() !== '' && !input.ollamaApiKey.startsWith('••')
      ? input.ollamaApiKey.trim()
      : existing.ollamaApiKey ?? process.env.OLLAMA_API_KEY ?? null

  await db.chatbotSettings.update({
    where: { id: existing.id },
    data: {
      enabled: input.enabled,
      enabledWebsiteChat: input.enabledWebsiteChat,
      enabledWhatsApp: input.enabledWhatsApp,
      enabledEmail: input.enabledEmail,
      botName: input.botName.trim(),
      ollamaApiKey,
      ollamaHost: input.ollamaHost.trim() || DEFAULTS.ollamaHost,
      ollamaModel: input.ollamaModel.trim() || DEFAULTS.ollamaModel,
      temperature: Math.min(1.5, Math.max(0, input.temperature)),
      systemPrompt: input.systemPrompt.trim() || DEFAULT_CRM_BOT_PROMPT,
    },
  })

  return getChatbotSettingsForAdmin()
}

export async function getPublicChatbotConfig() {
  const row = await db.chatbotSettings.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!row) {
    return {
      enabled: false,
      enabledWebsiteChat: false,
      botName: DEFAULTS.botName,
    }
  }

  const ollamaApiKey = resolveOllamaApiKey(row.ollamaApiKey)
  const active = row.enabled && Boolean(ollamaApiKey)

  return {
    enabled: active,
    enabledWebsiteChat: active && row.enabledWebsiteChat,
    botName: row.botName || DEFAULTS.botName,
  }
}
