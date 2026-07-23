'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionAwareSidebar } from './PermissionAwareSidebar'
import { ClientSidebar } from './client-sidebar'

interface RoleBasedSidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

export function RoleBasedSidebar({ className, isCollapsed, onToggle }: RoleBasedSidebarProps) {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  // Client users get client sidebar
  if (user.role === 'CLIENT') {
    return (
      <ClientSidebar 
        className={className} 
        isCollapsed={isCollapsed} 
        onToggle={onToggle} 
      />
    )
  }

  // All staff users get the same permission-aware sidebar for consistency
  if (user.role === 'STAFF') {
    return (
      <PermissionAwareSidebar 
        className={className} 
        isCollapsed={isCollapsed} 
        onToggle={onToggle} 
      />
    )
  }

  // Fallback to permission-aware sidebar
  return (
    <PermissionAwareSidebar 
      className={className} 
      isCollapsed={isCollapsed} 
      onToggle={onToggle} 
    />
  )
}
