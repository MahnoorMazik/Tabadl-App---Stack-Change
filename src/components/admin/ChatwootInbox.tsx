'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Conversation = {
  id: number
  unread_count: number
  timestamp: number
  meta: { sender: { id: number; name: string; phone_number?: string } }
  messages: Array<{ content?: string }>
}

type Message = {
  id: number
  content: string
  message_type: number
  created_at: number
  sender?: { name?: string }
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

function timeAgo(unixSeconds: number) {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function ChatwootInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chatwoot/conversations')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const list: Conversation[] = data.data?.payload ?? data.payload ?? []
      setConversations(Array.isArray(list) ? list : [])
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId: number) => {
    try {
      const res = await fetch(`/api/chatwoot/conversations/${conversationId}/messages`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const list: Message[] = data.payload ?? data.data?.payload ?? data ?? []
      setMessages(Array.isArray(list) ? list : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load messages')
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
    const t = setInterval(() => void fetchConversations(), 5000)
    return () => clearInterval(t)
  }, [fetchConversations])

  useEffect(() => {
    if (activeId == null) return
    void fetchMessages(activeId)
    const t = setInterval(() => void fetchMessages(activeId), 3000)
    return () => clearInterval(t)
  }, [activeId, fetchMessages])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!draft.trim() || activeId == null) return
    setSending(true)
    const content = draft
    setDraft('')
    try {
      const res = await fetch(`/api/chatwoot/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await fetchMessages(activeId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send')
      setDraft(content)
    } finally {
      setSending(false)
    }
  }

  const active = conversations.find((c) => c.id === activeId) || null

  return (
    <div className="grid h-[calc(100vh-11rem)] min-h-[480px] overflow-hidden rounded-xl border bg-card shadow-sm md:grid-cols-[320px_1fr]">
      <aside className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 border-b px-4 py-3.5 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          WhatsApp Inbox
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingList && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Loading conversations…
            </div>
          )}

          {!loadingList && conversations.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No open conversations yet. New WhatsApp messages will appear here.
            </p>
          )}

          <ul className="m-0 list-none p-0">
            {conversations.map((c) => {
              const name = c.meta?.sender?.name || 'Unknown'
              const last = c.messages?.[c.messages.length - 1]
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors',
                      c.id === activeId
                        ? 'bg-emerald-50 dark:bg-emerald-950/30'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate font-semibold">{name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(c.timestamp)}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {last?.content?.slice(0, 48) || '…'}
                      </div>
                    </div>
                    {c.unread_count > 0 && (
                      <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <main className="flex min-h-0 flex-col bg-muted/30">
        {!active && (
          <div className="m-auto px-6 text-center text-sm text-muted-foreground">
            Select a conversation to start replying.
          </div>
        )}

        {active && (
          <>
            <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                {initials(active.meta?.sender?.name || '?')}
              </div>
              <div>
                <div className="text-sm font-semibold">{active.meta?.sender?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {active.meta?.sender?.phone_number || ''}
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.message_type === 1 ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-sm',
                      m.message_type === 1
                        ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-50'
                        : 'bg-card'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    <span className="mt-1 block text-right text-[10px] text-muted-foreground">
                      {new Date(m.created_at * 1000).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>

            <div className="flex gap-2 border-t bg-card p-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder="Type a reply…"
                rows={1}
                className="min-h-10 max-h-28 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </main>

      {error && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-red-900 px-3 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
