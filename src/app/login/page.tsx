'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailInput } from '@/components/ui/email-input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { validateEmail } from '@/lib/email-validation'
import Link from 'next/link'
import { Building2, Lock, AlertCircle } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export default function ClientLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const router = useRouter()
  const { login } = useAuth()
  const { t } = useLocale()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailError('')
    
    // Validate email before submitting
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
      setError(err.message || t('auth.invalidCredentials'))
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
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
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
              <Link href="/forgot-password" className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline">
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

