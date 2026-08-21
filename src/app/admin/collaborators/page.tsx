'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Search,
  Filter,
  Building2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'

type Client = {
  id: string
  name: string
  company: string | null
  clientNumber: string
}

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
  client: {
    id: string
    name: string
    email: string
    company: string | null
    clientNumber: string
  } | null
}

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

export default function AdminCollaboratorsPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'

  const [rows, setRows] = useState<CollaboratorRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [filterClientId, setFilterClientId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterClientId && filterClientId !== 'all') params.append('clientId', filterClientId)
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus)
      if (searchTerm) params.append('search', searchTerm)

      const res = await axios.get(`/api/admin/collaborators?${params.toString()}`)
      setRows(res.data?.data?.collaborators ?? [])
      setClients(res.data?.data?.clients ?? [])
    } catch (error: any) {
      toast({
        title: 'Failed to load collaborators',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [filterClientId, filterStatus, searchTerm, toast])

  useEffect(() => {
    if (!authLoading && user) void load()
  }, [authLoading, user, load])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !selectedClientId) return
    setSending(true)
    try {
      const res = await axios.post('/api/admin/collaborators', {
        email: email.trim(),
        clientId: selectedClientId,
      })
      toast({
        title: 'Invite Sent',
        description: `Invitation sent to ${email} for ${res.data?.data?.client?.company || res.data?.data?.client?.name}`,
      })
      setEmail('')
      setSelectedClientId('')
      await load()
    } catch (error: any) {
      toast({
        title: 'Invite Failed',
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
      await axios.post(`/api/admin/collaborators/${id}`)
      toast({ title: 'Invite Resent' })
      await load()
    } catch (error: any) {
      toast({
        title: 'Resend Failed',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const openRevokeDialog = (collaborator: CollaboratorRow) => {
    setSelectedCollaborator(collaborator)
    setShowRevokeDialog(true)
  }

  const openDeleteDialog = (collaborator: CollaboratorRow) => {
    setSelectedCollaborator(collaborator)
    setShowDeleteDialog(true)
  }

  const confirmRevoke = async () => {
    if (!selectedCollaborator) return
    setBusyId(selectedCollaborator.id)
    try {
      await axios.delete(`/api/admin/collaborators/${selectedCollaborator.id}?action=revoke`)
      toast({
        title: 'Collaborator Revoked',
        description: `${selectedCollaborator.inviteEmail} has been revoked.`,
      })
      await load()
      setShowRevokeDialog(false)
      setSelectedCollaborator(null)
    } catch (error: any) {
      toast({
        title: 'Revoke Failed',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!selectedCollaborator) return
    setBusyId(selectedCollaborator.id)
    try {
      await axios.delete(`/api/admin/collaborators/${selectedCollaborator.id}?action=delete`)
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

  const getActions = (row: CollaboratorRow): Action[] => {
    const actions: Action[] = []
    const isBusy = busyId === row.id

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
    <AdminPageTemplate
      title="Collaborator Management"
      description="Manage all collaborator invitations across all clients"
      icon={<Users className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Collaborator
            </CardTitle>
            <CardDescription>Send a collaborator invitation to any client</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="admin-collab-email">Email</Label>
                <Input
                  id="admin-collab-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  required
                  disabled={sending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-collab-client">Client</Label>
                <Select
                  value={selectedClientId || undefined}
                  onValueChange={setSelectedClientId}
                  disabled={sending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company || client.name} ({client.clientNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={sending || !selectedClientId}
                  className="w-full bg-emerald-700 hover:bg-emerald-800"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Invite
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Collaborators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-[200px]">
                <Select value={filterClientId || undefined} onValueChange={(value) => setFilterClientId(value || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company || client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <Select value={filterStatus || undefined} onValueChange={(value) => setFilterStatus(value || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="REVOKED">Revoked</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => {
                setFilterClientId('')
                setFilterStatus('')
                setSearchTerm('')
              }}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No collaborators found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {row.client?.company || row.client?.name || 'N/A'}
                              </span>
                            </div>
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
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revoke Dialog */}
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
                <li>They will lose access to the client data</li>
                <li>You can <strong className="text-blue-600">re-invite</strong> them anytime</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={confirmRevoke}
              disabled={busyId === selectedCollaborator?.id}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              Yes, Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
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
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={busyId === selectedCollaborator?.id}
            >
              Yes, Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageTemplate>
  )
}