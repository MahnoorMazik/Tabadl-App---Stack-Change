'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, Mail, Shield, User, Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight, MoreVertical } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { MAIN_ROLE_NAMES } from '@/lib/rbac'

export default function TeamPage() {
  const { user: currentUser, loading: authLoading, token } = useAuth()
  const { t, formatNumber } = useLocale()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([])
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    customRoleId: ''
  })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    customRoleId: '',
    isActive: true,
    password: ''
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.get('/api/users?role=STAFF&limit=100', { headers })
      const raw = response.data?.data?.users ?? response.data?.users ?? []
      setUsers(raw)
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: (error.response?.data?.error ?? t('admin.team.fetchFailed')) || "Failed to fetch team members",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchRoles = useCallback(async () => {
    try {
      const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const res = await axios.get('/api/roles', { headers })
      const list = res.data?.data?.roles ?? res.data?.roles ?? []
      const main = [MAIN_ROLE_NAMES.ADMIN, MAIN_ROLE_NAMES.CLIENTS, MAIN_ROLE_NAMES.REPORTS, MAIN_ROLE_NAMES.SUPPORT]
      setRoles(list.filter((r: { name: string }) => main.some((m) => m === r.name)))
    } catch {
      setRoles([])
    }
  }, [token])

  const refetchUsersAndRoles = useCallback(() => {
    fetchUsers()
    fetchRoles()
  }, [fetchUsers, fetchRoles])

  useEffect(() => {
    if (authLoading) return
    if (!currentUser) {
      setLoading(false)
      return
    }
    fetchUsers()
    fetchRoles()
  }, [currentUser?.id, authLoading, fetchUsers, fetchRoles])

  const handleEdit = (user: any) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name ?? '',
      email: user.email ?? '',
      customRoleId: user.customRole?.id ?? '',
      isActive: user.isActive ?? true,
      password: ''
    })
    setIsEditDialogOpen(true)
  }

  const handleView = (user: any) => {
    setSelectedUser(user)
    setIsViewDialogOpen(true)
  }

  const handleDelete = (user: any) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleStatusToggle = async (user: any) => {
    try {
      const authToken = token || localStorage.getItem('auth-token')
      const response = await axios.put(`/api/users/${user.id}`, {
        ...user,
        isActive: !user.isActive
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const updated = response.data?.data?.user ?? response.data?.user
      setUsers((prev) => prev.map(u => (u.id === user.id ? { ...u, ...updated } : u)))
      refetchUsersAndRoles()
      toast({
        title: t('common.success'),
        description: !user.isActive ? t('admin.team.userActivated') || 'User activated successfully' : t('admin.team.userDeactivated') || 'User deactivated successfully'
      })
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.team.statusUpdateFailed') || "Failed to update user status",
        variant: "destructive"
      })
    }
  }

  const handleUpdateUser = async () => {
    try {
      const authToken = token || localStorage.getItem('auth-token')
      
      // Only include password if it's not empty
      const { password, ...updateDataWithoutPassword } = editForm
      const updateData = password && password.trim() !== '' 
        ? editForm 
        : updateDataWithoutPassword
      
      const response = await axios.put(`/api/users/${selectedUser.id}`, updateData, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      
      const updated = response.data?.data?.user ?? response.data?.user
      setUsers((prev) => prev.map(u => (u.id === selectedUser.id ? updated : u)))
      setIsEditDialogOpen(false)
      refetchUsersAndRoles()
      toast({
        title: t('common.success'),
        description: t('admin.team.userUpdated') || "User updated successfully"
      })
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.team.updateFailed') || "Failed to update user",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async () => {
    try {
      const authToken = token || localStorage.getItem('auth-token')
      console.log('🗑️ Deleting user:', selectedUser.id)
      
      const response = await axios.delete(`/api/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      
      console.log('✅ Delete response:', response.data)
      
      setUsers((prev) => prev.filter(u => u.id !== selectedUser.id))
      setIsDeleteDialogOpen(false)
      refetchUsersAndRoles()
      toast({
        title: t('common.success'),
        description: t('admin.team.userDeleted') || "User deleted successfully"
      })
    } catch (error: any) {
      console.error('❌ Delete user error:', error)
      console.error('❌ Error response:', error.response?.data)
      console.error('❌ Error status:', error.response?.status)
      
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.team.deleteFailed') || "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const getRoleBadge = (customRole: { name: string } | null | undefined) => {
    const name = customRole?.name ?? '—'
    const colors: Record<string, string> = {
      [MAIN_ROLE_NAMES.ADMIN]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      [MAIN_ROLE_NAMES.CLIENTS]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      [MAIN_ROLE_NAMES.REPORTS]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      [MAIN_ROLE_NAMES.SUPPORT]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    }
    const roleLabels: Record<string, string> = {
      [MAIN_ROLE_NAMES.ADMIN]: t('admin.team.roleAdmin'),
      [MAIN_ROLE_NAMES.CLIENTS]: t('admin.team.roleClients'),
      [MAIN_ROLE_NAMES.REPORTS]: t('admin.team.roleReports'),
      [MAIN_ROLE_NAMES.SUPPORT]: t('admin.team.roleSupport'),
    }
    const displayName = roleLabels[name] || name
    return <Badge className={colors[name] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}>{displayName}</Badge>
  }

  const AddButton = () => (
    <Button onClick={() => {
      setCreateForm({
        name: '',
        email: '',
        customRoleId: ''
      })
      setIsCreateDialogOpen(true)
    }}>
      <Plus className="h-4 w-4 mr-2" />
      {t('admin.team.inviteMember')}
    </Button>
  )

  const handleCreateUser = async () => {
    try {
      if (!createForm.name || !createForm.email || !createForm.customRoleId) {
        toast({
          title: t('common.error'),
          description: t('admin.team.fillAllFields') || "Please fill in all required fields including Role",
          variant: "destructive"
        })
        return
      }

      const authToken = token || localStorage.getItem('auth-token')
      const response = await axios.post('/api/users', {
        name: createForm.name,
        email: createForm.email,
        role: 'STAFF',
        customRoleId: createForm.customRoleId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      const newUser = response.data?.data?.user ?? response.data?.user
      setUsers((prev) => (newUser ? [newUser, ...prev] : prev))
      setIsCreateDialogOpen(false)
      setCreateForm({ name: '', email: '', customRoleId: '' })
      refetchUsersAndRoles()
      toast({
        title: t('common.success'),
        description: t('admin.team.credentialsSent') || 'Team member created. Login credentials sent via email.'
      })
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || error.response?.data?.message || t('admin.team.createFailed') || "Failed to create team member",
        variant: "destructive"
      })
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.team.title')}
      description={t('admin.team.description')}
      icon={<Users className="h-6 w-6" />}
      showConstruction={false}
      requiredPermission="user_management.view"
      actions={<AddButton />}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin.team.totalStaff')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(users.length)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin.team.roleAdmin')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(users.filter(u => u.customRole?.name === MAIN_ROLE_NAMES.ADMIN).length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin.team.roleClients')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(users.filter(u => u.customRole?.name === MAIN_ROLE_NAMES.CLIENTS).length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin.team.roleReports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(users.filter(u => u.customRole?.name === MAIN_ROLE_NAMES.REPORTS).length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin.team.roleSupport')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(users.filter(u => u.customRole?.name === MAIN_ROLE_NAMES.SUPPORT).length)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.team.teamMembers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('admin.team.loadingTeam')}</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('admin.team.noTeamMembers')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.team.name')}</TableHead>
                    <TableHead>{t('admin.team.email')}</TableHead>
                    <TableHead>{t('admin.team.role')}</TableHead>
                    <TableHead>{t('admin.team.lastLogin')}</TableHead>
                    <TableHead>{t('admin.team.status')}</TableHead>
                    <TableHead>{t('admin.team.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-emerald-600 flex items-center justify-center text-white">
                            <User className="h-4 w-4" />
                          </Avatar>
                          <span className="font-medium">{user.name ?? user.email ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.customRole)}</TableCell>
                      <TableCell>
                        {user.lastLoginAt
                          ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm')
                          : t('admin.team.never')}
                      </TableCell>
                      <TableCell>
                        <Badge className={user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                          {user.isActive ? t('admin.clients.active') : t('admin.clients.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusToggle(user)}
                            title={user.isActive ? t('admin.team.deactivate') || 'Deactivate' : t('admin.team.activate') || 'Activate'}
                          >
                            {user.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleView(user)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {t('common.view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(user)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              {user.id !== currentUser?.id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(user)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('common.delete')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.team.inviteMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">{t('common.name')} *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="create-email">{t('auth.email')} *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="create-role">{t('admin.team.role')} *</Label>
              <Select value={createForm.customRoleId} onValueChange={(v) => setCreateForm({ ...createForm, customRoleId: v })}>
                <SelectTrigger id="create-role">
                  <SelectValue placeholder={t('admin.team.selectRole') || 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateUser}>
              {t('admin.team.createMember') || 'Create Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.email === 'admin@tk.sa' ? t('admin.team.editCoreAdmin') || 'Edit Core Admin' : t('admin.team.editTeamMember') || 'Edit Team Member'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Core admin - only email and password */}
            {selectedUser?.email === 'admin@tk.sa' ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('admin.team.coreAdminProtection') || 'Core Admin Protection'}</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    {t('admin.team.coreAdminNote') || 'Only email and password can be changed for the core admin account.'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="password">{t('admin.team.passwordKeepCurrent') || 'Password (leave blank to keep current)'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder={t('admin.team.enterNewPassword') || 'Enter new password'}
                  />
                </div>
              </>
            ) : (
              /* Regular users - full edit */
              <>
                <div>
                  <Label htmlFor="name">{t('common.name')}</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-role">{t('admin.team.role')}</Label>
                  <Select value={editForm.customRoleId} onValueChange={(v) => setEditForm({ ...editForm, customRoleId: v })}>
                    <SelectTrigger id="edit-role">
                      <SelectValue placeholder={t('admin.team.selectRole') || 'Select role'} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="password">{t('admin.team.passwordKeepCurrent') || 'Password (leave blank to keep current)'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder={t('admin.team.enterNewPassword') || 'Enter new password'}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={editForm.isActive}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                  />
                  <Label htmlFor="isActive">{t('common.active')}</Label>
                </div>
              </>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateUser}>
                {t('admin.team.updateUser') || 'Update User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.team.userDetails') || 'User Details'}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>{t('common.name')}</Label>
                <p className="text-sm font-medium">{selectedUser.name ?? selectedUser.email ?? '—'}</p>
              </div>
              <div>
                <Label>{t('auth.email')}</Label>
                <p className="text-sm font-medium">{selectedUser.email ?? '—'}</p>
              </div>
              <div>
                <Label>{t('admin.team.role')}</Label>
                <p className="text-sm font-medium">{selectedUser.customRole?.name ?? '—'}</p>
              </div>
              <div>
                <Label>{t('common.status')}</Label>
                <Badge className={selectedUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                  {selectedUser.isActive ? t('admin.clients.active') : t('admin.clients.inactive')}
                </Badge>
              </div>
              <div>
                <Label>{t('admin.team.lastLogin')}</Label>
                <p className="text-sm font-medium">
                  {selectedUser.lastLoginAt
                    ? format(new Date(selectedUser.lastLoginAt), 'MMM dd, yyyy HH:mm')
                    : t('admin.team.never')}
                </p>
              </div>
              <div>
                <Label>{t('admin.team.created') || 'Created'}</Label>
                <p className="text-sm font-medium">
                  {format(new Date(selectedUser.createdAt), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.team.deleteTeamMember') || 'Delete Team Member'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.team.deleteConfirm') || 'Are you sure you want to delete'} <strong>{(selectedUser?.name ?? selectedUser?.email ?? t('admin.team.thisUser')) || 'this user'}</strong>?
              <br /><br />
              <strong>{t('admin.team.warning') || 'Warning'}:</strong> {t('admin.team.deleteWarning') || 'This will permanently delete all user data and profile, assigned tasks and applications, messages and notifications, and support conversations.'}
              <br /><br />
              {t('admin.team.cannotUndo') || 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              {t('admin.team.deletePermanently') || 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageTemplate>
  )
}
