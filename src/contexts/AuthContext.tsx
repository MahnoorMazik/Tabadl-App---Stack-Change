'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { setupAxiosAuthInterceptor } from '@/lib/axios-auth'
import { UserRole, StaffType } from '@prisma/client'
import { Permission } from '@/lib/rbac'
import { resolveLoginErrorCode } from '@/lib/auth/login-errors'

interface User {
  id: string
  email: string
  name: string | null
  phone?: string | null
  avatar?: string | null
  role: UserRole
  staffType?: StaffType | null
  permissions?: Permission[]
  clientProfile?: {
    id: string
    clientNumber: string
    company: string | null
  } | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, userType?: 'client' | 'staff') => Promise<void>
  register: (data: RegisterData, userType?: 'client' | 'staff') => Promise<{ requiresEmailVerification: boolean; email: string }>
  logout: (callbackUrl?: string) => Promise<void>
  loading: boolean
  permissionsLoading: boolean
  update: () => Promise<void>
}

interface RegisterData {
  name: string
  nameAr?: string
  email: string
  password: string
  companyName?: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession()
  const loading = status === 'loading'
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [clientProfile, setClientProfile] = useState<User['clientProfile']>(null)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const permissionsFetchedRef = useRef(false)
  const profileFetchedRef = useRef(false)

  useEffect(() => {
    setupAxiosAuthInterceptor()
  }, [])

  // Fetch permissions on-demand; 401/404 = session invalid (e.g. DB reset, fresh deploy) → sign out
  const fetchPermissions = useCallback(async () => {
    if (!session?.user || permissionsLoading || permissionsFetchedRef.current) return
    
    setPermissionsLoading(true)
    permissionsFetchedRef.current = true
    try {
      const response = await fetch('/api/auth/permissions')
      if (response.status === 401 || response.status === 404) {
        await signOut({ callbackUrl: session.user.role === 'CLIENT' ? '/login' : '/admin/login' })
        return
      }
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || [])
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      permissionsFetchedRef.current = false
    } finally {
      setPermissionsLoading(false)
    }
  }, [session?.user, permissionsLoading])

  // Fetch client profile on-demand (only for clients); 401/404 = session invalid → sign out
  const fetchClientProfile = useCallback(async () => {
    if (!session?.user || profileLoading || session.user.role !== UserRole.CLIENT || profileFetchedRef.current) return
    
    setProfileLoading(true)
    profileFetchedRef.current = true
    try {
      const response = await fetch('/api/auth/profile')
      if (response.status === 401 || response.status === 404) {
        await signOut({ callbackUrl: '/login' })
        return
      }
      if (response.ok) {
        const data = await response.json()
        setClientProfile(data.clientProfile || null)
      }
    } catch (error) {
      console.error('Error fetching client profile:', error)
      profileFetchedRef.current = false
    } finally {
      setProfileLoading(false)
    }
  }, [session?.user, profileLoading])

  // Fetch permissions when user logs in (only once per session)
  useEffect(() => {
    if (session?.user && !permissionsFetchedRef.current) {
      setPermissionsLoading(true)
      fetchPermissions()
      if (session.user.role === UserRole.CLIENT && !profileFetchedRef.current) {
        fetchClientProfile()
      }
    } else if (!session?.user) {
      setPermissions([])
      setClientProfile(null)
      permissionsFetchedRef.current = false
      profileFetchedRef.current = false
      setPermissionsLoading(false)
    }
  }, [session?.user, fetchPermissions, fetchClientProfile])

  const user: User | null = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    avatar: session.user.avatar,
    role: session.user.role,
    staffType: session.user.staffType,
    permissions: permissions, // Use fetched permissions instead of session
    clientProfile: clientProfile // Use fetched clientProfile instead of session
  } : null

  const login = async (email: string, password: string, userType: 'client' | 'staff' = 'client') => {
    const result = await signIn('credentials', {
      email,
      password,
      userType,
      redirect: false
    })

    if (result?.error) {
      throw new Error(
        resolveLoginErrorCode({
          error: result.error,
          code: (result as { code?: string }).code,
        }),
      )
    }

    if (!result?.ok) {
      throw new Error('Login failed')
    }
  }

  const register = async (data: RegisterData, userType: 'client' | 'staff' = 'client') => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userType }),
    })

    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.error || 'Registration failed')
    }

    // ✅ Handle BOTH response shapes:
    //   1. .NET backend:      { requiresEmailVerification: true, email: "..." }
    //   2. Legacy Next.js:    { data: { requiresEmailVerification: true, email: "..." } }
    const requiresEmailVerification = Boolean(
      payload.requiresEmailVerification ??
      payload.data?.requiresEmailVerification
    )
    const email = payload.email ?? payload.data?.email ?? data.email

    return {
      requiresEmailVerification,
      email,
    }
  }

  const logout = async (callbackUrl = '/') => {
    await signOut({ callbackUrl })
  }

  const handleUpdate = async () => {
    await update()
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token: null,
      login, 
      register, 
      logout, 
      loading,
      permissionsLoading,
      update: handleUpdate
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}