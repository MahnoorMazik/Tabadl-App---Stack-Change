/**
 * Global axios interceptor: on 401/404 (session invalid, e.g. DB reset, fresh deploy),
 * sign out and redirect to login so user doesn't need to manually logout.
 * Import this once from a client component (e.g. AuthContext).
 */
'use client'

import axios from 'axios'
import { signOut } from 'next-auth/react'

let interceptorId: number | null = null

export function setupAxiosAuthInterceptor() {
  if (interceptorId != null) return
  interceptorId = axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status
      if (status === 401 || status === 404) {
        const path = typeof window !== 'undefined' ? window.location.pathname : ''
        const callbackUrl =
          path.startsWith('/admin') || path.startsWith('/staff')
            ? '/admin/login'
            : '/login'
        signOut({ callbackUrl })
      }
      return Promise.reject(error)
    }
  )
}
