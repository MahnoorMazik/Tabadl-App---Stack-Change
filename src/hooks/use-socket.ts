import { useEffect, useState, useRef, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'

export function useSocket(userId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!userId) return

    // Create socket connection
    // Use NEXT_PUBLIC_WS_URL if available, otherwise use NEXT_PUBLIC_API_URL, fallback to window location
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
                  process.env.NEXT_PUBLIC_API_URL?.replace('http://', 'ws://').replace('https://', 'wss://') ||
                  (typeof window !== 'undefined' ? window.location.origin.replace('http://', 'ws://').replace('https://', 'wss://') : 'ws://localhost:3007')
    const newSocket = io(wsUrl, {
      path: '/api/socketio',
      transports: ['polling', 'websocket'],  // Try polling first, then upgrade to websocket
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = newSocket

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      setConnected(true)
      
      // Join user room for notifications
      if (userId) {
        newSocket.emit('join-user', userId)
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [userId])

  const joinCaseRoom = useCallback((caseId: string) => {
    if (socket) {
      socket.emit('join-case', caseId)
    }
  }, [socket])

  const joinApplicationRoom = useCallback((applicationId: string) => {
    if (socket) {
      socket.emit('join-application', applicationId)
    }
  }, [socket])

  const sendMessage = useCallback((message: any) => {
    if (socket) {
      socket.emit('send-message', message)
    }
  }, [socket])

  const startTyping = useCallback((caseId: string, userName: string) => {
    if (socket) {
      socket.emit('typing', { caseId, userName })
    }
  }, [socket])

  const stopTyping = useCallback((caseId: string) => {
    if (socket) {
      socket.emit('stop-typing', { caseId })
    }
  }, [socket])

  return {
    socket,
    connected,
    joinCaseRoom,
    joinApplicationRoom,
    sendMessage,
    startTyping,
    stopTyping,
  }
}

