'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersList, type UserRow } from '@/components/users/UsersList'
import { Users } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/use-permissions'
import { Module, Action } from '@/lib/rbac'
import { useToast } from '@/hooks/use-toast'

export default function UsersPage() {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission(`${Module.USER_MANAGEMENT}.${Action.CREATE}`)
  const canEdit = hasPermission(`${Module.USER_MANAGEMENT}.${Action.UPDATE}`)
  const canDelete = hasPermission(`${Module.USER_MANAGEMENT}.${Action.DELETE}`)

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const authHeaders = useCallback(() => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }, [token])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        role: roleFilter,
      })
      if (debouncedSearch) params.set('search', debouncedSearch)

      const response = await axios.get(`/api/users?${params.toString()}`, { headers: authHeaders() })
      const data = response.data?.data ?? response.data
      setUsers(data.users ?? [])
      if (data.pagination) setPagination(data.pagination)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, roleFilter, authHeaders, toast])

  useEffect(() => {
    if (user) fetchUsers()
  }, [user, fetchUsers])

  const stats = {
    total: pagination.total,
    staff: users.filter((u) => u.role === 'STAFF').length,
    active: users.filter((u) => u.isActive).length,
  }

  return (
    <AdminPageTemplate
      title="User Management"
      description="Manage staff and client accounts with role-based access control"
      icon={<Users className="h-6 w-6" />}
      showConstruction={false}
      requiredPermission={`${Module.USER_MANAGEMENT}.${Action.VIEW}`}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On This Page</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active (page)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.active}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <UsersList
              users={users}
              loading={loading}
              pagination={pagination}
              search={search}
              roleFilter={roleFilter}
              onSearchChange={setSearch}
              onRoleFilterChange={(v) => {
                setRoleFilter(v)
                setPage(1)
              }}
              onPageChange={setPage}
              onRefresh={fetchUsers}
              currentUserId={user?.id}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
