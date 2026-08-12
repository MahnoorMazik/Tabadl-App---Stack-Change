'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const { t } = useLocale()
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleResend = async () => {
    if (!email) {
      setError(t('auth.emailRequiredForResend'))
      return
    }
    setResending(true)
    setError('')
    setMessage('')
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
      setMessage(t('auth.verificationEmailResent'))
    } catch (err: any) {
      setError(err.message || t('auth.resendVerificationFailed'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-card dark:border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-emerald-700 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-foreground">
            {t('auth.checkYourEmail')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-muted-foreground">
            {t('auth.checkYourEmailDescription')}
            {email ? (
              <>
                {' '}
                <span className="font-medium text-foreground">{email}</span>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.checkSpamFolder')}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || !email}
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('auth.resending')}
              </>
            ) : (
              t('auth.resendVerificationEmail')
            )}
          </Button>
          <Button asChild className="w-full bg-emerald-700 hover:bg-emerald-800">
            <Link href="/login">{t('auth.goToLogin')}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  )
}
