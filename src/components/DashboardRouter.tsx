'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function DashboardRouter() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'CLIENT') {
        router.push('/dashboard')
      } else if (user.role === 'STAFF') {
        // All staff members (including admin) go to admin dashboard
        router.push('/admin/dashboard')
      } else {
        router.push('/')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return null
}