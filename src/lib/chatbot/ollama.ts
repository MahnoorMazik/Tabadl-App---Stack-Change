import type { ResolvedChatbotSettings } from '@/lib/chatbot/settings'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

interface OllamaChatResponse {
  message?: { role: string; content: string }
  error?: string
}

export async function chatWithOllama(
  settings: ResolvedChatbotSettings,
  messages: ChatMessage[]
): Promise<string> {
  const url = `${settings.ollamaHost.replace(/\/$/, '')}/api/chat`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.ollamaApiKey}`,
    },
    body: JSON.stringify({
      model: settings.ollamaModel,
      messages,
      stream: false,
      options: { temperature: settings.temperature },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama API error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as OllamaChatResponse
  if (data.error) throw new Error(data.error)
  const content = data.message?.content?.trim()
  if (!content) throw new Error('Ollama returned an empty response')
  return content
}
