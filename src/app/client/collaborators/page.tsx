'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { MobileLayout } from '@/lib/mobile-layout-utils'
import { useMobileSidebar } from '@/hooks/use-mobile-sidebar'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Loader2,
  Mail,
  UserPlus,
  RefreshCw,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type CollaboratorRow = {
  id: string
  inviteEmail: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  invitedAt: string
  acceptedAt: string | null
  expiresAt: string | null
  collaboratorUser: {
    id: string
    name: string | null
    email: string
    lastLoginAt: string | null
  } | null
}

function statusBadge(status: CollaboratorRow['status']) {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'PENDING':
      return 'bg-amber-100 text-amber-900 border-amber-200'
    case 'EXPIRED':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'REVOKED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return ''
  }
}

export default function ClientCollaboratorsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'
  const {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    toggleMobileSidebar,
    toggleDesktopSidebar,
    closeMobileSidebar,
  } = useMobileSidebar()

  const [rows, setRows] = useState<CollaboratorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/client/collaborators')
      setRows(res.data?.data?.collaborators ?? [])
    } catch (error: any) {
      toast({
        title: t('client.collaboration.loadFailed'),
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    if (!authLoading && user) void load()
  }, [authLoading, user, load])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await axios.post('/api/client/collaborators', {
        email: email.trim(),
        sendWhatsApp: Boolean(phone.trim()),
        phone: phone.trim() || undefined,
      })
      if (!res.data?.data?.emailSent) {
        toast({
          title: t('client.collaboration.inviteCreated'),
          description:
            res.data?.data?.emailError ||
            t('client.collaboration.emailSendFailed'),
          variant: 'destructive',
        })
      } else {
        toast({
          title: t('client.collaboration.inviteSent'),
          description: t('client.collaboration.inviteSentDesc'),
        })
      }
      setEmail('')
      setPhone('')
      await load()
    } catch (error: any) {
      toast({
        title: t('client.collaboration.inviteFailed'),
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleResend = async (id: string) => {
    setBusyId(id)
    try {
      await axios.post(`/api/client/collaborators/${id}`)
      toast({ title: t('client.collaboration.inviteResent') })
      await load()
    } catch (error: any) {
      toast({
        title: t('client.collaboration.resendFailed'),
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleRevoke = async (id: string) => {
    setBusyId(id)
    try {
      await axios.delete(`/api/client/collaborators/${id}`)
      toast({ title: t('client.collaboration.revoked') })
      await load()
    } catch (error: any) {
      toast({
        title: t('client.collaboration.revokeFailed'),
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <MobileLayout
      isSidebarCollapsed={isSidebarCollapsed}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobile={toggleMobileSidebar}
      onToggleDesktop={toggleDesktopSidebar}
      onCloseMobile={closeMobileSidebar}
      title={t('client.collaboration.pageTitle')}
      description={t('client.collaboration.pageDescription')}
      icon={<Users className="h-5 w-5 text-emerald-600" />}
    >
      <div className="max-w-5xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <AlertCircle className="h-4 w-4 text-emerald-700" />
          <AlertDescription>{t('client.collaboration.oneClientNote')}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-700" />
              {t('client.collaboration.addTitle')}
            </CardTitle>
            <CardDescription>{t('client.collaboration.addDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="collab-email">{t('auth.email')}</Label>
                <Input
                  id="collab-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  required
                  disabled={sending}
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="collab-phone">
                  {t('client.collaboration.whatsappOptional')}
                </Label>
                <Input
                  id="collab-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                  disabled={sending}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={sending}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {t('client.collaboration.sendInvite')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('client.collaboration.listTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('client.collaboration.empty')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('auth.email')}</TableHead>
                    <TableHead>{t('client.collaboration.status')}</TableHead>
                    <TableHead>{t('client.collaboration.invitedAt')}</TableHead>
                    <TableHead className={isRTL ? 'text-left' : 'text-right'}>
                      {t('client.collaboration.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.inviteEmail}</div>
                        {row.collaboratorUser?.name ? (
                          <div className="text-xs text-muted-foreground">
                            {row.collaboratorUser.name}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border', statusBadge(row.status))}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(row.invitedAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                        <div className={cn('flex gap-1', isRTL ? 'justify-start' : 'justify-end')}>
                          {row.status !== 'ACCEPTED' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === row.id}
                              onClick={() => void handleResend(row.id)}
                            >
                              {busyId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          {row.status !== 'REVOKED' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-200 hover:bg-red-50"
                              disabled={busyId === row.id}
                              onClick={() => void handleRevoke(row.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  )
}
