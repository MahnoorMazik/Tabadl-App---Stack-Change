'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Eye, EyeOff, Camera, Trash2 } from 'lucide-react'
import { toAvatarUrl } from '@/lib/avatar-utils'
import { UserRole, StaffType } from '@prisma/client'
import axios from 'axios'
import { useToast } from '@/hooks/use-toast'
import { CORE_ADMIN_EMAIL } from '@/lib/users/constants'

interface RoleOption {
  id: string
  name: string
}

interface UserFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string | null
  onSuccess?: () => void
  canEdit?: boolean
}

export function UserFormModal({
  open,
  onOpenChange,
  userId,
  onSuccess,
  canEdit = true,
}: UserFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!userId
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [isCoreAdmin, setIsCoreAdmin] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: UserRole.STAFF as UserRole,
    staffType: '' as string,
    customRoleId: '',
    isActive: true,
    password: '',
    avatar: null as string | null,
  })

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    if (!open) return

    setLoading(true)
    const load = async () => {
      try {
        const rolesRes = await axios.get('/api/roles', { headers: authHeaders() })
        const roleList = rolesRes.data?.data?.roles ?? rolesRes.data?.roles ?? []
        setRoles(roleList.filter((r: RoleOption & { isActive?: boolean }) => r.isActive !== false))

        if (userId) {
          const userRes = await axios.get(`/api/users/${userId}`, { headers: authHeaders() })
          const u = userRes.data?.user ?? userRes.data
          setIsCoreAdmin(u.email === CORE_ADMIN_EMAIL)
          setForm({
            name: u.name ?? '',
            email: u.email ?? '',
            phone: u.phone ?? '',
            role: u.role ?? UserRole.STAFF,
            staffType: u.staffType ?? '',
            customRoleId: u.customRoleId ?? u.customRole?.id ?? '',
            isActive: u.isActive ?? true,
            password: '',
            avatar: u.avatar ?? null,
          })
        } else {
          setIsCoreAdmin(false)
          setForm({
            name: '',
            email: '',
            phone: '',
            role: UserRole.STAFF,
            staffType: '',
            customRoleId: '',
            isActive: true,
            password: '',
            avatar: null,
          })
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load form data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setSaving(true)
    try {
      if (isEdit && userId) {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          customRoleId: form.customRoleId || null,
          staffType: form.staffType || null,
          isActive: form.isActive,
        }
        if (form.password.trim()) payload.password = form.password

        await axios.put(`/api/users/${userId}`, payload, { headers: authHeaders() })
        toast({ title: 'Success', description: 'User updated successfully' })
      } else {
        await axios.post(
          '/api/users',
          {
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            role: form.role,
            staffType: form.staffType || null,
            customRoleId: form.customRoleId || null,
          },
          { headers: authHeaders() }
        )
        toast({
          title: 'Success',
          description: 'User created. Login credentials sent via email.',
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Save failed',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!userId) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axios.post(`/api/users/${userId}/avatar`, fd, { headers: authHeaders() })
      setForm((f) => ({ ...f, avatar: res.data.user?.avatar ?? res.data.filePath }))
      toast({ title: 'Success', description: 'Avatar updated' })
    } catch {
      toast({ title: 'Error', description: 'Avatar upload failed', variant: 'destructive' })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarRemove = async () => {
    if (!userId) return
    setAvatarUploading(true)
    try {
      await axios.delete(`/api/users/${userId}/avatar`, { headers: authHeaders() })
      setForm((f) => ({ ...f, avatar: null }))
      toast({ title: 'Success', description: 'Avatar removed' })
    } catch {
      toast({ title: 'Error', description: 'Failed to remove avatar', variant: 'destructive' })
    } finally {
      setAvatarUploading(false)
    }
  }

  const initials = form.name
    ? form.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isEdit && (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={toAvatarUrl(form.avatar) ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {canEdit && !isCoreAdmin && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={avatarUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                    {form.avatar && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={avatarUploading}
                        onClick={handleAvatarRemove}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-label="Upload avatar"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleAvatarUpload(f)
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                disabled={isCoreAdmin && isEdit}
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={isCoreAdmin}
              />
            </div>

            {!isEdit && (
              <div>
                <Label>Account Type</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.STAFF}>Staff</SelectItem>
                    <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === UserRole.STAFF && (
              <>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={form.customRoleId}
                    onValueChange={(v) => setForm((f) => ({ ...f, customRoleId: v }))}
                    disabled={isCoreAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Staff Type</Label>
                  <Select
                    value={form.staffType}
                    onValueChange={(v) => setForm((f) => ({ ...f, staffType: v }))}
                    disabled={isCoreAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {Object.values(StaffType).map((st) => (
                        <SelectItem key={st} value={st}>
                          {st.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {isEdit && (
              <>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                    disabled={isCoreAdmin}
                  />
                </div>

                <div>
                  <Label htmlFor="password">New Password (optional)</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Leave blank to keep current"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {!isEdit && (
              <p className="text-sm text-muted-foreground">
                A random password will be generated and emailed to the user.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {canEdit && (
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    'Save Changes'
                  ) : (
                    'Create User'
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
