'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailInput } from '@/components/ui/email-input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { validateEmail } from '@/lib/email-validation'
import Link from 'next/link'
import { Building2, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { LOGIN_ERROR_LOCALE_KEY, resolveLoginErrorCode, type LoginErrorCode } from '@/lib/auth/login-errors'

function ClientLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [emailError, setEmailError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const justVerified = searchParams.get('verified') === '1'
  const { login } = useAuth()
  const { t } = useLocale()

  const messageForLoginError = (code: LoginErrorCode) => t(LOGIN_ERROR_LOCALE_KEY[code])

  useEffect(() => {
    const urlError = searchParams.get('error')
    const urlCode = searchParams.get('code')
    if (!urlError && !urlCode) return

    const code = resolveLoginErrorCode({ error: urlError, code: urlCode })
    if (code === 'EMAIL_NOT_VERIFIED') {
      setNeedsVerification(true)
    }
    setError(messageForLoginError(code))

    const params = new URLSearchParams(searchParams.toString())
    params.delete('error')
    params.delete('code')
    const next = params.toString()
    router.replace(next ? `/login?${next}` : '/login', { scroll: false })
  }, [searchParams])

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setResendMessage('')
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('auth.resendVerificationFailed'))
      }
      setResendMessage(t('auth.verificationEmailResent'))
    } catch (err: any) {
      setResendMessage(err.message || t('auth.resendVerificationFailed'))
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailError('')
    setNeedsVerification(false)
    setResendMessage('')
    
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!)
      return
    }
    
    setLoading(true)

    try {
      await login(email, password, 'client')
      router.push('/dashboard')
    } catch (err: any) {
      const code = resolveLoginErrorCode({ error: err?.message })
      if (code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true)
      }
      setError(messageForLoginError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-card dark:border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-emerald-700 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-foreground">{t('auth.clientLogin')}</CardTitle>
          <CardDescription className="text-gray-600 dark:text-muted-foreground">
            {t('auth.accessDashboard')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {justVerified && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription>{t('auth.emailVerifiedSuccess')}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {needsVerification && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="underline font-medium"
                      >
                        {resending ? t('auth.resending') : t('auth.resendVerificationEmail')}
                      </button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {resendMessage && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription>{resendMessage}</AlertDescription>
              </Alert>
            )}
            
            <EmailInput
              id="email"
              label={t('auth.email')}
              placeholder="you@example.com"
              value={email}
              error={emailError}
              onChange={(value) => setEmail(value)}
              disabled={loading}
              required
            />

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('auth.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link href="/client/forgot-password" className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={loading}
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>

            <div className="text-center text-sm text-gray-600 dark:text-muted-foreground">
              {t('auth.dontHaveAccount')}{' '}
              <Link href="/signup" className="text-emerald-700 dark:text-emerald-400 font-semibold hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline">
                {t('auth.signup')}
              </Link>
            </div>

            <div className="text-center text-sm">
              <Link href="/" className="text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:underline">
                {t('auth.backToHome')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <ClientLoginForm />
    </Suspense>
  )
}
