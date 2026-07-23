'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/hooks/use-socket'
import axios from 'axios'

interface NotificationContextType {
  unreadCount: number
  setUnreadCount: (n: number) => void
  refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const { socket } = useSocket(user?.id)

  const refreshUnreadCount = useCallback(async () => {
    if (!token && !user) {
      setUnreadCount(0)
      return
    }
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await axios.get('/api/notifications', {
        headers,
        withCredentials: true,
      })
      const unread = response.data?.data?.unreadCount ?? response.data?.unreadCount ?? 0
      setUnreadCount(unread)
    } catch {
      setUnreadCount(0)
    }
  }, [token, user])

  // When a new notification is pushed via Socket.IO, update badge immediately (no click needed)
  useEffect(() => {
    if (!socket) return
    const onNewNotification = () => {
      setUnreadCount((prev) => prev + 1)
    }
    socket.on('new-notification', onNewNotification)
    return () => {
      socket.off('new-notification', onNewNotification)
    }
  }, [socket])

  // Refresh when user becomes available or token changes
  useEffect(() => {
    if (!token && !user) {
      setUnreadCount(0)
      return
    }
    refreshUnreadCount()
  }, [token, user, refreshUnreadCount])

  // Refresh when tab becomes visible (e.g. user returns from another tab or push opened)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (token || user)) {
        refreshUnreadCount()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [token, user, refreshUnreadCount])

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationCount() {
  const ctx = useContext(NotificationContext)
  if (ctx === undefined) {
    throw new Error('useNotificationCount must be used within NotificationProvider')
  }
  return ctx
}
