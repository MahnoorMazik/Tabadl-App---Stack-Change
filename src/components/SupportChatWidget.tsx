'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, X, Minimize2, Maximize2, User, CircleQuestionMark } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { cn } from '@/lib/utils'
import { MessageStatusTicks } from '@/components/MessageStatusTicks'
import { useMessageRetry } from '@/hooks/use-message-retry'
import { RefreshCw, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  tempId?: string
  content: string
  isFromVisitor: boolean
  isBot?: boolean
  visitorName?: string
  status: 'SENT' | 'DELIVERED' | 'READ'
  timestamp: Date
  sending?: boolean
  error?: string
}

export function SupportChatWidget() {
  const pathname = usePathname()
  const [visitorId, setVisitorId] = useState<string>('')
  const [visitorName, setVisitorName] = useState<string>('')
  const [visitorEmail, setVisitorEmail] = useState<string>('')
  const [showNameForm, setShowNameForm] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [botEnabled, setBotEnabled] = useState(false)
  const [botName, setBotName] = useState('TK Assistant')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const autoScrollRef = useRef(true)
  const isLoadingOlderRef = useRef(false)

  // Message retry logic
  const { retryingMessages, addFailedMessage, retryMessage, cancelRetry } = useMessageRetry({
    maxRetries: 3,
    onRetrySuccess: (tempId, result) => {
      // Replace temp message with real one
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...msg, id: result.message.id, sending: false, error: undefined } : msg
      ))
    },
    onRetryFailed: (tempId) => {
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...msg, error: 'Failed to send. Click to retry.', sending: false } : msg
      ))
    },
  })

  // Hide on dashboard/admin/client/staff pages - only show on public pages
  const isDashboardPage = pathname?.startsWith('/dashboard') || 
                          pathname?.startsWith('/admin') || 
                          pathname?.startsWith('/client') ||
                          pathname?.startsWith('/staff') ||
                          pathname?.startsWith('/api') ||
                          pathname === '/login' ||
                          pathname === '/signup'

  // Initialize visitor ID on mount
  useEffect(() => {
    // Generate or retrieve visitor ID from localStorage
    let id = localStorage.getItem('tk-visitor-id')
    if (!id) {
      id = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem('tk-visitor-id', id)
    }
    setVisitorId(id)

    // Get saved name and email if available
    const savedName = localStorage.getItem('tk-visitor-name')
    const savedEmail = localStorage.getItem('tk-visitor-email')
    if (savedName) setVisitorName(savedName)
    if (savedEmail) setVisitorEmail(savedEmail)

    fetch('/api/chatbot/public')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setBotEnabled(Boolean(data.enabledWebsiteChat))
          if (data.botName) setBotName(data.botName)
        }
      })
      .catch(() => {})
  }, [])

  // Load messages function - using useCallback to ensure it's stable and can be called from socket handler
  const loadMessages = useCallback(async ({
    cursor,
    append = false,
  }: {
    cursor?: string | null
    append?: boolean
  } = {}) => {
    if (!visitorId) return

    if (append) {
      if (isLoadingOlderRef.current || !cursor) {
        return
      }
      isLoadingOlderRef.current = true
      setIsLoadingOlder(true)
      autoScrollRef.current = false
    }

    let previousScrollTop: number | null = null
    let previousScrollHeight: number | null = null
    const container = scrollContainerRef.current
    if (append && container) {
      previousScrollTop = container.scrollTop
      previousScrollHeight = container.scrollHeight
    }

    try {
      const params = new URLSearchParams({
        visitorId,
        limit: '20',
      })

      if (cursor) {
        params.set('cursor', cursor)
      }

      const response = await fetch(`/api/support-messages?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const rawMessages = data?.data?.messages || data?.messages || []
        const pagination = data?.data?.pagination || data?.pagination || {}

        const formattedMessages: Message[] = (Array.isArray(rawMessages) ? rawMessages : [])
          .map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            isFromVisitor: msg.isFromVisitor,
            isBot: msg.isBot ?? false,
            visitorName: msg.visitorName,
            status: msg.status || 'SENT',
            timestamp: new Date(msg.createdAt || msg.timestamp),
          }))

        if (append) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(message => message.id))
            const newItems = formattedMessages.filter(item => item.id && !existingIds.has(item.id))
            return [...newItems, ...prev]
          })
        } else {
          setMessages(formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))
          autoScrollRef.current = true
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
          })
        }

        setHasMore(Boolean(pagination?.hasMore))
        setNextCursor(pagination?.nextCursor ?? null)

        if (append && container && previousScrollHeight !== null && previousScrollTop !== null) {
          requestAnimationFrame(() => {
            if (!scrollContainerRef.current) return
            const newScrollHeight = scrollContainerRef.current.scrollHeight
            scrollContainerRef.current.scrollTop =
              previousScrollTop! + (newScrollHeight - previousScrollHeight)
          })
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      if (!append) {
        setMessages([])
      }
    } finally {
      if (append) {
        isLoadingOlderRef.current = false
        setIsLoadingOlder(false)
      }
    }
  }, [visitorId])

  // Load messages when visitorId is set
  useEffect(() => {
    if (!visitorId) return
    loadMessages()
  }, [visitorId, loadMessages])

  // Connect to Socket.IO
  useEffect(() => {
    if (!visitorId) return

    // Use NEXT_PUBLIC_WS_URL if available, otherwise use NEXT_PUBLIC_API_URL, fallback to window location
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
                  process.env.NEXT_PUBLIC_API_URL?.replace('http://', 'ws://').replace('https://', 'wss://') ||
                  (typeof window !== 'undefined' ? window.location.origin.replace('http://', 'ws://').replace('https://', 'wss://') : 'ws://localhost:3007')
    const socketInstance = io(wsUrl, {
      path: '/api/socketio',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      // Join support room
      socketInstance.emit('join-support', visitorId)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('support-message', (message: any) => {
      // Only process messages for this visitor
      if (message.visitorId !== visitorId) {
        return
      }

      // If message doesn't have valid ID, reload from API to get the real message
      if (!message.id || message.id.length < 10 || /^\d+$/.test(message.id)) {
        // Invalid ID - reload messages from API to get the real database ID
        if (visitorId) {
          loadMessages()
        }
        return
      }

      const formattedMessage: Message = {
        id: message.id,
        content: message.content,
        isFromVisitor: message.isFromVisitor,
        isBot: message.isBot ?? false,
        visitorName: message.visitorName,
        status: message.status || 'SENT',
        timestamp: new Date(message.timestamp || message.createdAt || Date.now()),
      }
      
      // Only add if not already in messages (prevent duplicates)
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === formattedMessage.id)
        if (exists) return prev

        const container = scrollContainerRef.current
        const isNearBottom =
          !isMinimized &&
          isOpen &&
          (container
            ? container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
              60
            : true)

        autoScrollRef.current = isNearBottom

        const updated = [...prev, formattedMessage].sort((a, b) =>
          a.timestamp.getTime() - b.timestamp.getTime()
        )

        return updated
      })
      
      // Increment unread if chat is minimized or closed and message is from support
      if ((isMinimized || !isOpen) && !formattedMessage.isFromVisitor) {
        setUnreadCount(prev => prev + 1)
      }
      
      // Auto-mark support messages as DELIVERED when received
      // Only if message has valid database ID
      if (!formattedMessage.isFromVisitor && isOpen && !isMinimized) {
        markMessageAsDelivered(formattedMessage.id)
      }
    })

    // Listen for message status updates
    socketInstance.on('message-status-updated', (data: any) => {
      if (data.messageType === 'support') {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId ? { ...msg, status: data.status } : msg
        ))
      }
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [visitorId, isMinimized, isOpen, loadMessages])

  useEffect(() => {
    // Focus input when opening chat
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }

    if (isOpen && !isMinimized) {
      autoScrollRef.current = true
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
      })
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    // Reset unread count when opening chat
    if (isOpen && !isMinimized) {
      setUnreadCount(0)
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && !isMinimized && autoScrollRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    }
  }, [messages, isOpen, isMinimized])

  useEffect(() => {
    if (!isOpen || isMinimized) {
      return
    }

    const container = document.querySelector('[data-support-scroll] [data-slot="scroll-area-viewport"]') as HTMLDivElement | null
    if (!container) {
      return
    }

    scrollContainerRef.current = container

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      autoScrollRef.current = distanceFromBottom < 60

      if (
        container.scrollTop <= 40 &&
        hasMore &&
        !isLoadingOlderRef.current &&
        nextCursor
      ) {
        loadMessages({ cursor: nextCursor, append: true })
      }
    }

    container.addEventListener('scroll', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollContainerRef.current === container) {
        scrollContainerRef.current = null
      }
    }
  }, [hasMore, nextCursor, loadMessages, isOpen, isMinimized])

  // Always hide on admin/dashboard pages - check after all hooks
  if (isDashboardPage) {
    return null
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (visitorName.trim()) {
      localStorage.setItem('tk-visitor-name', visitorName)
      if (visitorEmail) {
        localStorage.setItem('tk-visitor-email', visitorEmail)
      }
      setShowNameForm(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !visitorId) return

    // If visitor hasn't provided name, show form
    if (!visitorName && !showNameForm) {
      setShowNameForm(true)
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const messageContent = newMessage.trim()
    
    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      content: messageContent,
      isFromVisitor: true,
      visitorName: visitorName || 'Guest',
      status: 'SENT',
      timestamp: new Date(),
      sending: true,
    }
    
    autoScrollRef.current = true
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')

    const sendFn = async () => {
      const response = await fetch('/api/support-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId,
          content: messageContent,
          visitorName: visitorName || 'Guest',
          visitorEmail: visitorEmail || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const responseBody = await response.json()
      const messageData = responseBody?.data?.message || responseBody?.message

      if (!messageData?.id) {
        throw new Error('Invalid response format: missing message id')
      }

      const formattedMessage: Message = {
        id: messageData.id,
        tempId: undefined,
        content: messageData.content,
        isFromVisitor: true,
        visitorName: messageData.visitorName,
        status: messageData.status || 'SENT',
        timestamp: new Date(messageData.createdAt || Date.now()),
      }
      
      // Update message with real ID
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...formattedMessage }
          : msg
      ))
      
        // Emit via socket for real-time updates with acknowledgment
        if (socket && socket.connected) {
          socket.emit('support-message', {
            ...formattedMessage,
            visitorId,
          }, (ack: any) => {
            console.log('Message delivered:', ack)
            // Update status to DELIVERED on acknowledgment
            if (ack.success) {
              setMessages(prev => prev.map(msg => 
                msg.id === formattedMessage.id && msg.status === 'SENT'
                  ? { ...msg, status: 'DELIVERED' as const }
                  : msg
              ))
            }
          })
        }

      return { message: formattedMessage }
    }

    try {
      await sendFn()
    } catch (error: any) {
      console.error('Error sending message:', error)
      // Mark message as failed and add to retry queue
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, error: 'Failed to send', sending: false }
          : msg
      ))
      addFailedMessage(tempId, messageContent, error.message)
    }
  }

  const handleRetryMessage = (tempId: string) => {
    const resend = async () => {
      const message = messages.find(m => m.tempId === tempId)
      if (!message) throw new Error('Message not found')

      const response = await fetch('/api/support-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId,
          content: message.content,
          visitorName: visitorName || 'Guest',
          visitorEmail: visitorEmail || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const responseBody = await response.json()
      const messageData = responseBody?.data?.message || responseBody?.message

      if (!messageData?.id) {
        throw new Error('Invalid response format: missing message id')
      }

      const formattedMessage: Message = {
        id: messageData.id,
        tempId: undefined,
        content: messageData.content,
        isFromVisitor: true,
        visitorName: messageData.visitorName,
        status: messageData.status || 'SENT',
        timestamp: new Date(messageData.createdAt || Date.now()),
      }

      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...formattedMessage } : msg
      ))

      if (socket && socket.connected) {
        socket.emit('support-message', {
          ...formattedMessage,
          visitorId,
        })
      }

      return { message: formattedMessage }
    }

    setMessages(prev => prev.map(msg => 
      msg.tempId === tempId ? { ...msg, sending: true, error: undefined } : msg
    ))
    
    retryMessage(tempId, resend)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const markMessageAsDelivered = async (messageId: string) => {
    try {
      await fetch(`/api/support-messages/${messageId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'DELIVERED' }),
      })
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'DELIVERED' as const } : msg
      ))
      
      // Notify via socket
      if (socket) {
        socket.emit('update-message-status', {
          messageId,
          status: 'DELIVERED',
          messageType: 'support',
        })
      }
    } catch (error) {
      console.error('Error marking message as delivered:', error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full p-0 gap-0 shadow-lg bg-emerald-600 hover:bg-emerald-700 z-50 shrink-0 [&_svg]:size-10"
        size="icon"
      >
        <CircleQuestionMark className="h-10 w-10 shrink-0" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 rounded-full p-0 flex items-center justify-center bg-red-500 text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <Card
      className={cn(
        "fixed shadow-2xl transition-all duration-300 border-2 z-50",
        "bottom-4 right-4 md:bottom-6 md:right-6 shrink-0",
        isMinimized 
          ? "w-[280px] sm:w-80 h-14 md:h-16" 
          : "w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-2rem)] sm:h-[500px] md:h-[600px] max-h-[calc(100vh-2rem)]"
      )}
    >
      <CardHeader className="p-3 md:p-4 border-b bg-emerald-600 text-white rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
            <CardTitle className="text-base md:text-lg">
              {botEnabled ? botName : 'Support Chat'}
            </CardTitle>
            {isConnected && (
              <Badge className="bg-green-500 text-white text-xs hidden sm:flex">
                {botEnabled ? 'AI Online' : 'Online'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8 text-white hover:bg-emerald-500"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Minimize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8 text-white hover:bg-emerald-500"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col" style={{ height: 'calc(100% - 4rem)', maxHeight: 'calc(100% - 4rem)' }}>
          {/* Name Form */}
          {showNameForm && (
            <div className="p-4 bg-emerald-50 border-b">
              <form onSubmit={handleNameSubmit} className="space-y-2">
                <p className="text-sm text-gray-700 mb-2">Please introduce yourself:</p>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="text-sm"
                  required
                />
                <Input
                  type="email"
                  placeholder="Your email (optional)"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  className="text-sm"
                />
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">
                  Start Chat
                </Button>
              </form>
            </div>
          )}

          {/* Messages Area */}
          <ScrollArea data-support-scroll className="flex-1 p-4" style={{ height: 'calc(100% - 140px)', maxHeight: 'calc(100% - 140px)' }}>
            <div className="space-y-4">
              {messages.length === 0 && !showNameForm && (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">
                    {botEnabled ? `Hi! I'm ${botName}` : 'Welcome to TK.sa Support!'}
                  </p>
                  <p className="text-xs mt-1">How can we help you today?</p>
                </div>
              )}
              
              {isLoadingOlder && (
                <div className="text-center text-xs text-gray-400">
                  Loading previous messages...
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.isFromVisitor ? "justify-end" : "justify-start"
                  )}
                >
                  {!message.isFromVisitor && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                        {message.isBot ? 'AI' : 'SP'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "flex flex-col",
                      message.isFromVisitor ? "items-end" : "items-start"
                    )}
                  >
                    {!message.isFromVisitor && (
                      <span className="text-xs text-gray-500 mb-1">
                        {message.isBot ? botName : 'Support Team'}
                      </span>
                    )}
                    <div
                      className={cn(
                        "chat-message-bubble rounded-lg px-4 py-2 max-w-[250px]",
                        message.isFromVisitor
                          ? message.error
                            ? "bg-red-100 border border-red-300 text-red-900"
                            : "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      )}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      {message.error && message.tempId && (
                        <button
                          onClick={() => handleRetryMessage(message.tempId!)}
                          className="flex items-center gap-1 text-xs text-red-600 mt-2 hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                      {message.sending && (
                        <div className="flex items-center gap-1 text-xs mt-1 opacity-70">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Sending...
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-400">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.isFromVisitor && (
                        <MessageStatusTicks status={message.status} />
                      )}
                    </div>
                  </div>
                  
                  {message.isFromVisitor && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                        {visitorName ? getInitials(visitorName) : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area - Fixed at bottom */}
          <div className="p-4 border-t bg-gray-50 flex-shrink-0" style={{ height: '100px', minHeight: '100px' }}>
            <div className="flex gap-2 mb-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={showNameForm ? "Please fill the form above first..." : "Type a message..."}
                className="flex-1 h-10"
                disabled={!isConnected || showNameForm}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected || showNameForm}
                className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4"
                size="default"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
            {!isConnected && (
              <p className="text-xs text-gray-500 text-center">
                Connecting to chat...
              </p>
            )}
            {isConnected && (
              <p className="text-xs text-green-600 text-center">
                Connected - Ready to chat!
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

