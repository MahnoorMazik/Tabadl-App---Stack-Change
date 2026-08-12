'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Users, AlertCircle, CheckCircle } from 'lucide-react'

type InviteData = {
  status: string
  inviteEmail: string
  client: { id: string; name: string; email: string; company: string | null; clientNumber: string }
  existingCollaborator: { id: string; name: string | null; email: string; phone: string | null } | null
  canAccept: boolean
}

export default function AcceptCollaboratorInvitePage() {
  const params = useParams()
  const token = params?.token as string
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/collaboration/invite/${token}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Invite not found')
        if (!cancelled) {
          setInvite(data.data)
          // ✅ Only set name if it exists and is not null
          if (data.data?.existingCollaborator?.name) {
            setName(data.data.existingCollaborator.name)
          }
          // ✅ Only set phone if it exists and is not null
          if (data.data?.existingCollaborator?.phone) {
            setPhone(data.data.existingCollaborator.phone)
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load invite')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const needsSignup = Boolean(invite && !invite.existingCollaborator)

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite?.canAccept) return
    setError('')

    if (needsSignup) {
      if (name.trim().length < 2) {
        setError('Please enter your full name')
        return
      }
      if (!phone.trim() || phone.trim().length < 10) {
        setError('Please enter a valid phone number (minimum 10 characters)')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/collaboration/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          needsSignup ? { name: name.trim(), password, phone: phone.trim() } : {}
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invite')

      setSuccess(true)

      if (needsSignup) {
        router.push('/collaborator/signup')
        return
      }

      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-emerald-700" />
          </div>
          <CardTitle className="text-2xl">Collaboration Invite</CardTitle>
          <CardDescription>
            {invite
              ? `${invite.client.company || invite.client.name} invited you to collaborate`
              : 'Invite details'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription>
                {needsSignup 
                  ? 'Account created! Redirecting to collaborator signup page...' 
                  : 'Invite accepted. Redirecting to login…'}
              </AlertDescription>
            </Alert>
          )}

          {invite && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Email:</span>{' '}
                <strong>{invite.inviteEmail}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Client:</span>{' '}
                <strong>{invite.client.company || invite.client.name}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                <strong>{invite.status}</strong>
              </p>
            </div>
          )}

          {invite?.canAccept && !success && (
            <form onSubmit={handleAccept} className="space-y-3">
              {needsSignup ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      disabled={submitting}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., +971501234567"
                      required
                      disabled={submitting}
                      className="bg-white"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter phone number with country code
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Create password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      disabled={submitting}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      disabled={submitting}
                      className="bg-white"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your existing collaborator account will be linked to this client.
                  Sign in after accepting.
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Accept invite
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Link href="/login" className="text-sm text-emerald-700 hover:underline">
            Go to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}