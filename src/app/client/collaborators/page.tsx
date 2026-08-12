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
  Ban,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

// ✅ Define the action type
type Action = {
  id: string
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant: 'default' | 'outline' | 'destructive' | 'ghost' | 'link'
  className: string
  disabled: boolean
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
      return 'bg-orange-100 text-orange-800 border-orange-200'
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

  // Dialog states
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorRow | null>(null)

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

  // ✅ Open Revoke Dialog
  const openRevokeDialog = (collaborator: CollaboratorRow) => {
    setSelectedCollaborator(collaborator)
    setShowRevokeDialog(true)
  }

  // ✅ Open Delete Dialog
  const openDeleteDialog = (collaborator: CollaboratorRow) => {
    setSelectedCollaborator(collaborator)
    setShowDeleteDialog(true)
  }

  // ✅ Confirm Revoke (Soft Delete)
  const confirmRevoke = async () => {
    if (!selectedCollaborator) return
    setBusyId(selectedCollaborator.id)
    try {
      await axios.delete(`/api/client/collaborators/${selectedCollaborator.id}?action=revoke`)
      toast({ 
        title: 'Collaborator Revoked',
        description: `${selectedCollaborator.inviteEmail} has been revoked. You can re-invite them anytime.`,
      })
      await load()
      setShowRevokeDialog(false)
      setSelectedCollaborator(null)
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

  // ✅ Confirm Delete (Permanent Delete)
  const confirmDelete = async () => {
    if (!selectedCollaborator) return
    setBusyId(selectedCollaborator.id)
    try {
      await axios.delete(`/api/client/collaborators/${selectedCollaborator.id}?action=delete`)
      toast({ 
        title: 'Collaborator Permanently Deleted',
        description: `${selectedCollaborator.inviteEmail} has been permanently removed`,
        variant: 'destructive',
      })
      await load()
      setShowDeleteDialog(false)
      setSelectedCollaborator(null)
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  // ✅ Determine which actions to show based on status - returns Action[]
  const getActions = (row: CollaboratorRow): Action[] => {
    const actions: Action[] = []
    const isBusy = busyId === row.id

    // 1. RESEND Button - Show for PENDING, EXPIRED, and REVOKED
    if (row.status === 'PENDING' || row.status === 'EXPIRED' || row.status === 'REVOKED') {
      actions.push({
        id: 'resend',
        icon: <RefreshCw className="h-3.5 w-3.5" />,
        label: 'Resend',
        onClick: () => handleResend(row.id),
        variant: 'outline',
        className: 'border-blue-200 text-blue-700 hover:bg-blue-50',
        disabled: isBusy,
      })
    }

    // 2. REVOKE Button - Show for PENDING, ACCEPTED (but not REVOKED or EXPIRED)
    if (row.status !== 'REVOKED' && row.status !== 'EXPIRED') {
      actions.push({
        id: 'revoke',
        icon: <Ban className="h-3.5 w-3.5" />,
        label: 'Revoke',
        onClick: () => openRevokeDialog(row),
        variant: 'outline',
        className: 'border-orange-300 text-orange-600 hover:bg-orange-50',
        disabled: isBusy,
      })
    }

    // 3. DELETE Button - Show for all statuses except REVOKED
    if (row.status !== 'REVOKED') {
      actions.push({
        id: 'delete',
        icon: <Trash2 className="h-3.5 w-3.5" />,
        label: 'Delete',
        onClick: () => openDeleteDialog(row),
        variant: 'outline',
        className: 'border-red-200 text-red-700 hover:bg-red-50',
        disabled: isBusy,
      })
    }

    return actions
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
                  {rows.map((row) => {
                    const actions = getActions(row)
                    return (
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
                            {row.status === 'REVOKED' && (
                              <span className="ml-1 text-xs">(Can re-invite)</span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(row.invitedAt), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                          <div className={cn('flex gap-1 flex-wrap', isRTL ? 'justify-start' : 'justify-end')}>
                            {actions.map((action) => {
                              const isLoading = busyId === row.id && (
                                action.id === 'resend' || 
                                action.id === 'revoke' || 
                                action.id === 'delete'
                              )
                              return (
                                <Button
                                  key={action.id}
                                  type="button"
                                  size="sm"
                                  variant={action.variant}
                                  className={action.className}
                                  disabled={action.disabled}
                                  onClick={action.onClick}
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    action.icon
                                  )}
                                </Button>
                              )
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ Revoke Confirmation Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-600">Revoke Collaborator Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for{' '}
              <strong>{selectedCollaborator?.collaboratorUser?.name || selectedCollaborator?.inviteEmail}</strong>?
              <br />
              <br />
              This will:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Change their status to <strong className="text-orange-600">REVOKED</strong></li>
                <li>They will lose access to your client data</li>
                <li>You can <strong className="text-blue-600">re-invite</strong> them anytime using the Resend button</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={confirmRevoke}
              disabled={busyId === selectedCollaborator?.id}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              {busyId === selectedCollaborator?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Yes, Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Delete Collaborator</DialogTitle>
            <DialogDescription>
              Are you sure you want to <strong>permanently delete</strong>{' '}
              <strong>{selectedCollaborator?.collaboratorUser?.name || selectedCollaborator?.inviteEmail}</strong>?
              <br />
              <br />
              This action:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li className="text-red-600 font-semibold">⚠️ CANNOT BE UNDONE</li>
                <li>Will permanently remove this collaborator relationship</li>
                <li>Will delete all invitation history</li>
                <li>The collaborator will need a <strong>new invite</strong> to work with you again</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={busyId === selectedCollaborator?.id}
            >
              {busyId === selectedCollaborator?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Yes, Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  )
}