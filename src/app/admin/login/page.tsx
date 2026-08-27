'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { validateEmail } from '@/lib/email-validation'
import { Shield, Lock, Eye, EyeOff, Mail } from 'lucide-react'
import { resolveLoginErrorCode } from '@/lib/auth/login-errors'

const EMAIL_ERR_USER_NOT_FOUND = 'No account found with this email'
const PASSWORD_ERR_WRONG = 'Incorrect password'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, login, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user && user.role === 'STAFF') {
      router.replace('/admin/dashboard')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setPasswordError('')

    // 1. Validate email only on submit (no validation while typing)
    const emailValidation = validateEmail(email.trim())
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error ?? 'Please enter a valid email address')
      return
    }

    // 2. Check password non-empty before calling API
    if (!password || !password.trim()) {
      setPasswordError('Please enter your password')
      return
    }

    setLoading(true)
    try {
      const checkRes = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await checkRes.json().catch(() => ({}))
      if (!data?.success) {
        const msg = data?.error ?? 'Login failed'
        if (msg === EMAIL_ERR_USER_NOT_FOUND) {
          setEmailError("This user doesn't exist")
        } else if (msg === PASSWORD_ERR_WRONG) {
          setPasswordError('Incorrect password')
        } else {
          setPasswordError(msg)
        }
        return
      }
      await login(email.trim(), password, 'staff')
      router.replace('/admin/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      const code = resolveLoginErrorCode({ error: message })
      if (code === 'USER_NOT_FOUND') {
        setEmailError("This user doesn't exist")
      } else if (code === 'INCORRECT_PASSWORD') {
        setPasswordError('Incorrect password')
      } else if (code === 'ACCOUNT_INACTIVE') {
        setPasswordError('Account is inactive. Contact an administrator.')
      } else {
        setPasswordError(message && message !== 'Configuration' ? message : 'Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  const clearErrorsOnInput = () => {
    if (emailError) setEmailError('')
    if (passwordError) setPasswordError('')
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 dark:border-amber-400"></div>
      </div>
    )
  }

  // If already logged in as staff, show a brief redirecting state
  if (user && user.role === 'STAFF') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 dark:border-amber-400"></div>
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-emerald-50 dark:bg-[#040404] dark:[background:#040404] p-4">
      <Card className="w-full max-w-md shadow-lg border-amber-200 dark:border-border dark:bg-card">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-amber-700 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-foreground">Staff Login</CardTitle>
          <CardDescription className="text-gray-600 dark:text-muted-foreground">
            Access the admin & staff dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 dark:text-foreground">
                <Mail className="h-4 w-4" />
                Staff Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@tk.sa"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearErrorsOnInput()
                }}
                disabled={loading}
                className={
                  emailError
                    ? 'border-red-500 bg-red-50/80 dark:bg-red-950/30 focus-visible:ring-red-500/20 focus-visible:border-red-500'
                    : ''
                }
                autoComplete="email"
              />
              {emailError && (
                <p className="text-sm text-red-600 dark:text-red-400">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 dark:text-foreground">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearErrorsOnInput()
                    }}
                    className={
                      passwordError
                        ? 'w-full pr-10 border-red-500 bg-red-50/80 dark:bg-red-950/30 focus-visible:ring-red-500/20 focus-visible:border-red-500'
                        : 'w-full pr-10'
                    }
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset rounded-r-md"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end text-sm">
              <Link
                href="/admin/forgot-password"
                className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

