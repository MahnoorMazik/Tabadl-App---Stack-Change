'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export default function VerifyEmailPage() {
  const params = useParams()
  const token = params?.token as string
  const router = useRouter()
  const { t } = useLocale()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage(t('auth.invalidVerificationLink'))
      return
    }

    let cancelled = false

    const verify = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await response.json()
        if (cancelled) return

        if (!response.ok) {
          setStatus('error')
          setMessage(data.error || t('auth.verificationFailed'))
          return
        }

        setStatus('success')
        setMessage(data.data?.message || t('auth.emailVerifiedSuccess'))
        setTimeout(() => {
          router.push('/login?verified=1')
        }, 2500)
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage(t('auth.verificationFailed'))
        }
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [token, router, t])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-card dark:border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center">
            {status === 'loading' && <Loader2 className="h-8 w-8 text-emerald-700 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-8 w-8 text-emerald-700" />}
            {status === 'error' && <AlertCircle className="h-8 w-8 text-red-600" />}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-foreground">
            {status === 'loading' && t('auth.verifyingEmail')}
            {status === 'success' && t('auth.emailVerified')}
            {status === 'error' && t('auth.verificationFailedTitle')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-muted-foreground">
            {status === 'loading' ? t('auth.pleaseWait') : message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {status === 'success' && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {status === 'error' && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/check-email">{t('auth.resendVerificationEmail')}</Link>
            </Button>
          )}
          <Button asChild className="w-full bg-emerald-700 hover:bg-emerald-800">
            <Link href="/login">{t('auth.goToLogin')}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
