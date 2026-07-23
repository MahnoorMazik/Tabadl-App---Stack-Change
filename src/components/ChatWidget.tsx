'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Send, X, Minimize2, Maximize2, User, RefreshCw, AlertCircle } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { cn } from '@/lib/utils'
import { MessageStatusTicks } from '@/components/MessageStatusTicks'
import { useMessageRetry } from '@/hooks/use-message-retry'

interface Message {
  id: string
  tempId?: string
  content: string
  senderId: string
  senderName: string
  senderRole: string
  status: 'SENT' | 'DELIVERED' | 'READ'
  timestamp: Date
  isOwn: boolean
  sending?: boolean
  error?: string
}

interface ChatWidgetProps {
  applicationId?: string
}

export function ChatWidget({ applicationId }: ChatWidgetProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Message retry logic
  const { addFailedMessage, retryMessage } = useMessageRetry({
    maxRetries: 3,
    onRetrySuccess: (tempId, result) => {
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

  // Load messages when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized && applicationId) {
      loadMessages()
    }
  }, [isOpen, isMinimized, applicationId])

  // Connect to Socket.IO
  useEffect(() => {
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
      // Join application room if applicationId exists
      if (applicationId) {
        socketInstance.emit('join-application', applicationId)
      }
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('new-message', (message: any) => {
      const formattedMessage: Message = {
        id: message.id || Date.now().toString(),
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        senderRole: message.senderRole,
        status: message.status || 'SENT',
        timestamp: new Date(message.timestamp),
        isOwn: message.senderId === user?.id,
      }
      
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === formattedMessage.id)) return prev
        return [...prev, formattedMessage]
      })
      
      // Increment unread if chat is minimized or closed and not own message
      if ((isMinimized || !isOpen) && !formattedMessage.isOwn) {
        setUnreadCount(prev => prev + 1)
      }
    })

    // Listen for message status updates
    socketInstance.on('message-status-updated', (data: any) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: data.status } : msg
      ))
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [applicationId, user?.id, isMinimized, isOpen])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus textarea when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, isMinimized])

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0)
    }
  }, [isOpen, isMinimized])

  const loadMessages = async () => {
    if (!applicationId) return
    
    setInitialLoading(true)
    try {
      const response = await fetch(`/api/messages?applicationId=${applicationId}`)
      if (response.ok) {
        const data = await response.json()
        // Handle structured response format: { success: true, data: { messages: [...] } }
        const messages = data?.data?.messages || data?.messages || []
        const formattedMessages: Message[] = (Array.isArray(messages) ? messages : []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.sender.id,
          senderName: msg.sender.name,
          senderRole: msg.sender.role,
          status: msg.status || 'SENT',
          timestamp: new Date(msg.createdAt),
          isOwn: msg.sender.id === user?.id,
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !applicationId) return

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const messageContent = newMessage.trim()
    
    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      content: messageContent,
      senderId: user.id,
      senderName: user.name ?? '',
      senderRole: user.role,
      status: 'SENT',
      timestamp: new Date(),
      isOwn: true,
      sending: true,
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setLoading(true)

    const sendFn = async () => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          content: messageContent,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      
      // Handle structured response format: { success: true, data: { message: {...} } }
      const message = data?.data?.message || data?.message
      
      // Update message with real ID
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, id: message.id, sending: false, status: message.status || 'SENT' }
          : msg
      ))
      
      // Emit via socket for real-time updates with acknowledgment
      if (socket && socket.connected) {
        socket.emit('send-message', {
          ...message,
          applicationId,
        }, (ack: any) => {
          console.log('Message delivered:', ack)
          // Update status to DELIVERED on acknowledgment
          if (ack.success) {
            setMessages(prev => prev.map(msg => 
              msg.tempId === tempId && msg.status === 'SENT'
                ? { ...msg, status: 'DELIVERED' as const }
                : msg
            ))
          }
        })
      }

      return data
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
    } finally {
      setLoading(false)
    }
  }

  const handleRetryMessage = (tempId: string) => {
    const message = messages.find(m => m.tempId === tempId)
    if (!message) return

    const sendFn = async () => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          content: message.content,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')
      return response.json()
    }

    setMessages(prev => prev.map(msg => 
      msg.tempId === tempId ? { ...msg, sending: true, error: undefined } : msg
    ))
    
    retryMessage(tempId, sendFn)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
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
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 z-50"
        size="icon"
      >
        <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
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
        "bottom-4 right-4 md:bottom-6 md:right-6",
        isMinimized 
          ? "w-[280px] sm:w-80 h-14 md:h-16" 
          : "w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-2rem)] sm:h-[500px] md:h-[600px] max-h-[calc(100vh-2rem)]"
      )}
    >
      <CardHeader className="p-3 md:p-4 border-b bg-emerald-600 text-white rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
            <CardTitle className="text-base md:text-lg">Chat Support</CardTitle>
            {isConnected && (
              <Badge className="bg-green-500 text-white text-xs hidden sm:flex">Online</Badge>
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
        <CardContent className="p-0 flex flex-col h-[calc(100%-3.5rem)] md:h-[calc(100%-4rem)]">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef as any}>
            <div className="space-y-3 md:space-y-4">
              {initialLoading ? (
                // Loading skeletons
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
                      <div className="flex flex-col max-w-[70%]">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-16 w-48 rounded-lg" />
                      </div>
                      {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
                    </div>
                  ))}
                </>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start a conversation with our team</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    {!message.isOwn && (
                      <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                          {getInitials(message.senderName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={cn("flex flex-col max-w-[75%] sm:max-w-[70%]", message.isOwn ? "items-end" : "items-start")}>
                      {!message.isOwn && (
                        <span className="text-xs text-gray-500 mb-1">{message.senderName}</span>
                      )}
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 md:px-4 md:py-2",
                          message.isOwn
                            ? message.error
                              ? "bg-red-100 border border-red-300 text-red-900"
                              : "bg-emerald-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        )}
                      >
                        <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
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
                        {message.isOwn && !message.error && (
                          <MessageStatusTicks status={message.status} />
                        )}
                      </div>
                    </div>
                    
                    {message.isOwn && (
                      <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                          {getInitials(message.senderName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 md:p-4 border-t bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
                disabled={!isConnected || loading}
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected || loading}
                className="bg-emerald-600 hover:bg-emerald-700 h-10"
                size="icon"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!isConnected && (
              <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                <AlertCircle className="h-3 w-3" />
                Connecting...
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
