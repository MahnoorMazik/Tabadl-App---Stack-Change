'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, MoreVertical, Edit, Trash2, Eye, Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toAvatarUrl } from '@/lib/avatar-utils'
import { UserFormModal } from '@/components/users/UserFormModal'
import { CORE_ADMIN_EMAIL } from '@/lib/users/constants'
import axios from 'axios'
import { useToast } from '@/hooks/use-toast'

export interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  staffType: string | null
  phone: string | null
  avatar: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  customRole?: { id: string; name: string; description?: string | null } | null
  _count?: { assignedApplications: number; assignedTasks: number; notifications: number }
}

interface UsersListProps {
  users: UserRow[]
  loading?: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  search: string
  roleFilter: string
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: string) => void
  onPageChange: (page: number) => void
  onRefresh: () => void
  currentUserId?: string
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function UsersList({
  users,
  loading,
  pagination,
  search,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onPageChange,
  onRefresh,
  currentUserId,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: UsersListProps) {
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewUser, setViewUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handleToggleStatus = async (user: UserRow) => {
    if (user.email === CORE_ADMIN_EMAIL || togglingId) return
    setTogglingId(user.id)
    try {
      await axios.put(`/api/users/${user.id}`, { isActive: !user.isActive }, { headers: authHeaders() })
      onRefresh()
      toast({ title: 'Success', description: `User ${user.isActive ? 'deactivated' : 'activated'}` })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Status update failed',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    try {
      await axios.delete(`/api/users/${deleteUser.id}`, { headers: authHeaders() })
      setDeleteUser(null)
      onRefresh()
      toast({ title: 'Success', description: 'User deleted' })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Delete failed',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const exportCsv = () => {
    const headers = ['Name', 'Email', 'Role', 'Custom Role', 'Status', 'Last Login', 'Created']
    const rows = users.map((u) => [
      u.name ?? '',
      u.email,
      u.role,
      u.customRole?.name ?? '',
      u.isActive ? 'Active' : 'Inactive',
      u.lastLoginAt ? format(new Date(u.lastLoginAt), 'yyyy-MM-dd HH:mm') : '',
      format(new Date(u.createdAt), 'yyyy-MM-dd'),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-sm"
          />
          <Select value={roleFilter} onValueChange={onRoleFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="CLIENT">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={users.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add User
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isCore = user.email === CORE_ADMIN_EMAIL
                const isSelf = user.id === currentUserId
                return (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewUser(user)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={toAvatarUrl(user.avatar) ?? undefined} />
                          <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name || '—'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.customRole?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {canEdit && !isCore ? (
                        <Switch
                          checked={user.isActive}
                          disabled={togglingId === user.id}
                          onCheckedChange={() => handleToggleStatus(user)}
                        />
                      ) : (
                        <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewUser(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => setEditId(user.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && !isCore && !isSelf && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <UserFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={onRefresh}
        canEdit={canCreate}
      />

      <UserFormModal
        open={!!editId}
        onOpenChange={(open) => !open && setEditId(null)}
        userId={editId}
        onSuccess={onRefresh}
        canEdit={canEdit}
      />

      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={toAvatarUrl(viewUser.avatar) ?? undefined} />
                  <AvatarFallback>{getInitials(viewUser.name, viewUser.email)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base">{viewUser.name}</p>
                  <p className="text-muted-foreground">{viewUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p>{viewUser.customRole?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Type</p>
                  <p>{viewUser.role}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Staff Type</p>
                  <p>{viewUser.staffType ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{viewUser.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{viewUser.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Login</p>
                  <p>
                    {viewUser.lastLoginAt
                      ? format(new Date(viewUser.lastLoginAt), 'MMM d, yyyy HH:mm')
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Applications</p>
                  <p>{viewUser._count?.assignedApplications ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tasks</p>
                  <p>{viewUser._count?.assignedTasks ?? 0}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {canEdit && viewUser && (
              <Button
                onClick={() => {
                  setEditId(viewUser.id)
                  setViewUser(null)
                }}
              >
                Edit User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteUser?.name ?? deleteUser?.email}</strong>?
            This will soft-delete the user and related records.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
