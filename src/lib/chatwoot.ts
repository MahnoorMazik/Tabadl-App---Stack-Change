const BASE_URL = (process.env.CHATWOOT_BASE_URL || '').replace(/\/$/, '')
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || ''
const API_TOKEN = process.env.CHATWOOT_API_TOKEN || ''

function assertEnv() {
  if (!BASE_URL || !ACCOUNT_ID || !API_TOKEN) {
    throw new Error(
      'Missing Chatwoot env vars. Set CHATWOOT_BASE_URL, CHATWOOT_ACCOUNT_ID, and CHATWOOT_API_TOKEN.'
    )
  }
}

async function chatwootFetch(path: string, options: RequestInit = {}) {
  assertEnv()
  const res = await fetch(`${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      api_access_token: API_TOKEN,
      ...(options.headers || {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Chatwoot API error ${res.status}: ${body}`)
  }
  return res.json()
}

export type ChatwootConversation = {
  id: number
  status: string
  timestamp: number
  unread_count: number
  messages: Array<{ content?: string }>
  meta: {
    sender: { id: number; name: string; phone_number?: string }
  }
}

export type ChatwootMessage = {
  id: number
  content: string
  message_type: number
  created_at: number
  sender?: { name?: string }
}

export function listConversations(inboxId: string | number, status = 'open') {
  return chatwootFetch(`/conversations?inbox_id=${inboxId}&status=${status}`)
}

export function getMessages(conversationId: number | string) {
  return chatwootFetch(`/conversations/${conversationId}/messages`)
}

export function sendMessage(conversationId: number | string, content: string) {
  return chatwootFetch(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      message_type: 'outgoing',
      private: false,
    }),
  })
}
