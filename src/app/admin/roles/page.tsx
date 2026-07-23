'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { DynamicSidebar } from '@/components/DynamicSidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Module, Action } from '@/lib/rbac'
import { Plus, Edit, Trash2, Shield, Users, Settings } from 'lucide-react'
import axios from 'axios'
import { useLocale } from '@/contexts/LocaleContext'

interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  isDefault: boolean
  isProtected: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    users: number
  }
}

export default function RolesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { t, formatNumber } = useLocale()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  })

  // Component mount/unmount logging
  useEffect(() => {
    console.log('[RolesPage] Component mounted')
    return () => {
      console.log('[RolesPage] Component unmounted')
    }
  }, [])

  // Auth state logging
  useEffect(() => {
    console.log('[RolesPage] Auth state changed:', {
      authLoading,
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      staffType: user?.staffType,
      userEmail: user?.email,
      permissionsCount: user?.permissions?.length || 0,
      permissions: user?.permissions || []
    })
  }, [user, authLoading])

  // Redirect if not logged in or not admin
  useEffect(() => {
    console.log('[RolesPage] Checking authorization...', {
      authLoading,
      hasUser: !!user,
      userRole: user?.role,
      staffType: user?.staffType,
      shouldRedirect: !authLoading && (!user || user.role !== 'STAFF' || user.staffType !== 'ADMIN')
    })

    if (!authLoading && (!user || user.role !== 'STAFF' || user.staffType !== 'ADMIN')) {
      console.warn('[RolesPage] Authorization failed - redirecting to login', {
        reason: !user ? 'No user' : user.role !== 'STAFF' ? 'Not STAFF' : 'Not ADMIN',
        userRole: user?.role,
        staffType: user?.staffType
      })
      router.push('/admin/login')
    } else if (!authLoading && user && user.role === 'STAFF' && user.staffType === 'ADMIN') {
      console.log('[RolesPage] Authorization passed - user is ADMIN')
    }
  }, [user, authLoading, router])

  // Fetch roles
  useEffect(() => {
    console.log('[RolesPage] Fetch roles effect triggered', {
      hasUser: !!user,
      userRole: user?.role,
      shouldFetch: user && user.role === 'STAFF'
    })

    if (user && user.role === 'STAFF') {
      console.log('[RolesPage] Conditions met, fetching roles...')
      fetchRoles()
    } else {
      console.log('[RolesPage] Conditions not met, skipping fetch', {
        hasUser: !!user,
        userRole: user?.role
      })
    }
  }, [user])

  const fetchRoles = async () => {
    const startTime = Date.now()
    console.log('[RolesPage] fetchRoles() called')
    
    try {
      const token = localStorage.getItem('auth-token')
      console.log('[RolesPage] Fetching roles from API...', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        endpoint: '/api/roles',
        timestamp: new Date().toISOString()
      })

      setLoading(true)
      const response = await axios.get('/api/roles', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const duration = Date.now() - startTime
      console.log('[RolesPage] Roles API response received', {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        responseStructure: {
          hasData: !!response.data,
          hasDataData: !!response.data?.data,
          hasDataDataRoles: !!response.data?.data?.roles,
          hasDataRoles: !!response.data?.roles,
          dataKeys: Object.keys(response.data || {}),
          dataDataKeys: response.data?.data ? Object.keys(response.data.data) : []
        },
        responseData: response.data
      })

      // Handle structured response format: { success: true, data: { roles: [...] } }
      const roles = response.data?.data?.roles || response.data?.roles || []
      console.log('[RolesPage] Processed roles data', {
        rolesCount: roles.length,
        roles: roles.map((r: Role) => ({
          id: r.id,
          name: r.name,
          permissionsCount: r.permissions?.length || 0,
          isProtected: r.isProtected,
          isDefault: r.isDefault,
          isActive: r.isActive,
          usersCount: r._count?.users || 0
        }))
      })

      setRoles(roles)
      console.log('[RolesPage] Roles state updated successfully', {
        rolesCount: roles.length
      })
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RolesPage] Error fetching roles:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : null,
        errorRequest: error?.request ? {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        } : null,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
    } finally {
      setLoading(false)
      console.log('[RolesPage] fetchRoles() completed, loading set to false')
    }
  }

  const handleCreateRole = async () => {
    const startTime = Date.now()
    console.log('[RolesPage] handleCreateRole() called', {
      formData: {
        name: formData.name,
        description: formData.description,
        permissionsCount: formData.permissions.length,
        permissions: formData.permissions
      },
      timestamp: new Date().toISOString()
    })

    // Validation
    if (!formData.name.trim()) {
      console.warn('[RolesPage] Create role validation failed: name is empty')
      return
    }

    if (formData.permissions.length === 0) {
      console.warn('[RolesPage] Create role validation failed: no permissions selected')
      return
    }

    try {
      const token = localStorage.getItem('auth-token')
      console.log('[RolesPage] Creating role via API...', {
        hasToken: !!token,
        endpoint: '/api/roles',
        method: 'POST',
        payload: formData
      })

      const response = await axios.post('/api/roles', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const duration = Date.now() - startTime
      console.log('[RolesPage] Role created successfully', {
        status: response.status,
        responseData: response.data,
        duration: `${duration}ms`,
        createdRole: response.data?.role || response.data?.data?.role
      })
      
      setIsCreateDialogOpen(false)
      setFormData({ name: '', description: '', permissions: [] })
      console.log('[RolesPage] Dialog closed and form reset')
      
      console.log('[RolesPage] Refreshing roles list...')
      fetchRoles()
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RolesPage] Error creating role:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        duration: `${duration}ms`,
        formData,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
    }
  }

  const handleUpdateRole = async () => {
    const startTime = Date.now()
    console.log('[RolesPage] handleUpdateRole() called', {
      selectedRole: selectedRole ? {
        id: selectedRole.id,
        name: selectedRole.name,
        isProtected: selectedRole.isProtected
      } : null,
      formData: {
        name: formData.name,
        description: formData.description,
        permissionsCount: formData.permissions.length,
        permissions: formData.permissions
      },
      timestamp: new Date().toISOString()
    })

    if (!selectedRole) {
      console.warn('[RolesPage] Update role failed: no selected role')
      return
    }

    // Validation
    if (!formData.name.trim()) {
      console.warn('[RolesPage] Update role validation failed: name is empty')
      return
    }

    if (formData.permissions.length === 0) {
      console.warn('[RolesPage] Update role validation failed: no permissions selected')
      return
    }

    try {
      const token = localStorage.getItem('auth-token')
      console.log('[RolesPage] Updating role via API...', {
        hasToken: !!token,
        endpoint: `/api/roles/${selectedRole.id}`,
        method: 'PUT',
        roleId: selectedRole.id,
        payload: formData
      })

      const response = await axios.put(`/api/roles/${selectedRole.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const duration = Date.now() - startTime
      console.log('[RolesPage] Role updated successfully', {
        status: response.status,
        responseData: response.data,
        duration: `${duration}ms`,
        updatedRole: response.data?.role || response.data?.data?.role
      })
      
      setIsEditDialogOpen(false)
      setSelectedRole(null)
      setFormData({ name: '', description: '', permissions: [] })
      console.log('[RolesPage] Dialog closed and form reset')
      
      console.log('[RolesPage] Refreshing roles list...')
      fetchRoles()
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RolesPage] Error updating role:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        duration: `${duration}ms`,
        roleId: selectedRole?.id,
        formData,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    const startTime = Date.now()
    console.log('[RolesPage] handleDeleteRole() called', {
      roleId,
      timestamp: new Date().toISOString()
    })

    // Find role details for logging
    const roleToDelete = roles.find(r => r.id === roleId)
    console.log('[RolesPage] Role to delete:', {
      role: roleToDelete ? {
        id: roleToDelete.id,
        name: roleToDelete.name,
        isProtected: roleToDelete.isProtected,
        usersCount: roleToDelete._count?.users || 0
      } : 'Role not found in state'
    })

    try {
      const token = localStorage.getItem('auth-token')
      console.log('[RolesPage] Deleting role via API...', {
        hasToken: !!token,
        endpoint: `/api/roles/${roleId}`,
        method: 'DELETE',
        roleId
      })

      const response = await axios.delete(`/api/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const duration = Date.now() - startTime
      console.log('[RolesPage] Role deleted successfully', {
        status: response.status,
        responseData: response.data,
        duration: `${duration}ms`,
        roleId
      })
      
      console.log('[RolesPage] Refreshing roles list...')
      fetchRoles()
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RolesPage] Error deleting role:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        duration: `${duration}ms`,
        roleId,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
    }
  }

  const handleEditRole = (role: Role) => {
    console.log('[RolesPage] handleEditRole() called', {
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissionsCount: role.permissions?.length || 0,
        isProtected: role.isProtected
      }
    })
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions
    })
    setIsEditDialogOpen(true)
    console.log('[RolesPage] Edit dialog opened, form data set')
  }

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }))
  }

  const getAllPermissions = () => {
    const permissions: string[] = []
    Object.values(Module).forEach(module => {
      Object.values(Action).forEach(action => {
        permissions.push(`${module}.${action}`)
      })
    })
    return permissions
  }

  // Loading state logging
  useEffect(() => {
    console.log('[RolesPage] Loading state changed', {
      authLoading,
      loading,
      rolesCount: roles.length,
      isShowingLoading: authLoading || loading
    })
  }, [authLoading, loading, roles.length])

  if (authLoading || loading) {
    console.log('[RolesPage] Rendering loading state', {
      authLoading,
      loading
    })
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || user.role !== 'STAFF') {
    console.warn('[RolesPage] Rendering null - user check failed', {
      hasUser: !!user,
      userRole: user?.role
    })
    return null
  }

  console.log('[RolesPage] Rendering main content', {
    rolesCount: roles.length,
    isCreateDialogOpen,
    isEditDialogOpen,
    hasSelectedRole: !!selectedRole
  })

  return (
    <div className="h-screen bg-gray-50 dark:bg-background flex overflow-hidden">
      {/* Dynamic Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-[70px]' : 'w-64'} transition-all duration-300 flex-shrink-0`}>
        <DynamicSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-card border-b dark:border-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-foreground">{t('admin.roles.title') || 'Role Management'}</h1>
                <p className="text-gray-600 dark:text-muted-foreground">{t('admin.roles.description') || 'Manage user roles and permissions'}</p>
              </div>
              <div className="flex items-center space-x-4">
                <LanguageSwitcher />
                <ThemeSwitcher />
                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">{t('admin.roles.allRoles') || 'All Roles'}</h2>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('admin.roles.createRole') || 'Create Role'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('admin.roles.createNewRole') || 'Create New Role'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('admin.roles.roleName') || 'Role Name'}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('admin.roles.enterRoleName') || 'Enter role name'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('common.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t('admin.roles.enterRoleDescription') || 'Enter role description'}
                    />
                  </div>
                  <div>
                    <Label>{t('admin.roles.permissions') || 'Permissions'}</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto">
                      {getAllPermissions().map(permission => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={formData.permissions.includes(permission)}
                            onCheckedChange={() => togglePermission(permission)}
                          />
                          <Label htmlFor={permission} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreateRole}>
                      {t('admin.roles.createRole') || 'Create Role'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>{role.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {role.isDefault && <Badge variant="secondary">{t('admin.roles.default') || 'Default'}</Badge>}
                      {role.isProtected && <Badge variant="destructive">{t('admin.roles.protected') || 'Protected'}</Badge>}
                      {!role.isActive && <Badge variant="outline">{t('admin.roles.inactive') || 'Inactive'}</Badge>}
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-sm text-gray-600">{role.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('admin.roles.users') || 'Users'}:</span>
                      <span className="font-medium">{formatNumber(role._count.users)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('admin.roles.permissions') || 'Permissions'}:</span>
                      <span className="font-medium">{formatNumber(role.permissions.length)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('admin.roles.created') || 'Created'}:</span>
                      <span className="font-medium">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRole(role)}
                      disabled={role.isProtected}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={role.isProtected || role._count.users > 0}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('common.delete')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('admin.roles.deleteRole') || 'Delete Role'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('admin.roles.deleteConfirm') || 'Are you sure you want to delete the role'} "{role.name}"? {t('admin.roles.cannotUndo') || 'This action cannot be undone.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteRole(role.id)}>
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.roles.editRole') || 'Edit Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('admin.roles.roleName') || 'Role Name'}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('admin.roles.enterRoleName') || 'Enter role name'}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">{t('common.description')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('admin.roles.enterRoleDescription') || 'Enter role description'}
              />
            </div>
            <div>
              <Label>{t('admin.roles.permissions') || 'Permissions'}</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto">
                {getAllPermissions().map(permission => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${permission}`}
                      checked={formData.permissions.includes(permission)}
                      onCheckedChange={() => togglePermission(permission)}
                    />
                    <Label htmlFor={`edit-${permission}`} className="text-sm">
                      {permission}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateRole}>
                {t('admin.roles.updateRole') || 'Update Role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
