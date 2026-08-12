'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PermissionAwareSidebar } from '@/components/PermissionAwareSidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Settings,
  AlertCircle,
  CheckCircle,
  Eye,
  MoreVertical
} from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { useLocale } from '@/contexts/LocaleContext'
import { Module } from '@/lib/rbac'

interface Role {
  id: string
  name: string
  description: string
  permissions: string // JSON string
  isDefault: boolean
  isProtected: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    users: number
  }
}

interface Permission {
  module: string
  action: string
  moduleInfo: {
    name: string
    description: string
  }
  actionInfo: {
    name: string
    description: string
  }
}

interface PermissionItem {
  permission: string
  action: string
  actionInfo: {
    name: string
    description: string
  }
}

interface PermissionModule {
  module: string
  moduleInfo: {
    name: string
    description: string
  }
  permissions: PermissionItem[]
}

interface AssignedUser {
  id: string
  name: string | null
  email: string
  role?: string | null
  staffType?: string | null
  isActive?: boolean
  lastLoginAt?: string | null
  createdAt?: string
}

export default function RoleManagementPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const { t, formatNumber } = useLocale()
  
  // Helper function to translate role names
  const translateRoleName = (roleName: string): string => {
    const roleTranslations: Record<string, string> = {
      'Admin': t('admin.team.roleAdmin'),
      'Clients': t('admin.team.roleClients'),
      'Reports': t('admin.team.roleReports'),
      'Support': t('admin.team.roleSupport'),
    }
    return roleTranslations[roleName] || roleName
  }
  
  // Helper function to translate role descriptions (for main roles)
  const translateRoleDescription = (description: string): string => {
    // If it's a standard description, try to translate it
    // Otherwise return as-is (for custom role descriptions)
    const descriptionTranslations: Record<string, string> = {
      'Super user. Access to every page and every option.': t('admin.roles.descriptionAdmin') || 'Super user. Access to every page and every option.',
      'Client management only. Leads, clients, applications, documents.': t('admin.roles.descriptionClients') || 'Client management only. Leads, clients, applications, documents.',
      'Reports section only.': t('admin.roles.descriptionReports') || 'Reports section only.',
      'Messages and sub-options only. Inbox, support messaging, templates.': t('admin.roles.descriptionSupport') || 'Messages and sub-options only. Inbox, support messaging, templates.',
    }
    return descriptionTranslations[description] || description
  }
  
  // Helper function to translate module names
  const translateModuleName = (moduleName: string): string => {
    const moduleTranslations: Record<string, string> = {
      'Dashboard': t('admin.permissions.module.dashboard'),
      'Client Management': t('admin.permissions.module.clients'),
      'Lead Management': t('admin.permissions.module.leads'),
      'Applications': t('admin.permissions.module.applications'),
      'Documents': t('admin.permissions.module.documents'),
      'Team Management': t('admin.permissions.module.team'),
      'Financial': t('admin.permissions.module.financial'),
      'Messages': t('admin.permissions.module.messages'),
      'Reports': t('admin.permissions.module.reports'),
      'Settings': t('admin.permissions.module.settings'),
      'Help & Support': t('admin.permissions.module.help'),
      'User Management': t('admin.permissions.module.userManagement'),
      'Role Management': t('admin.permissions.module.roleManagement'),
      'Support': t('admin.permissions.module.support'),
      'Tasks': t('admin.permissions.module.tasks'),
      'Invoices': t('admin.permissions.module.invoices'),
      'Payments': t('admin.permissions.module.payments'),
      'Expenses': t('admin.permissions.module.expenses'),
      'Analytics': t('admin.permissions.module.analytics'),
    }
    return moduleTranslations[moduleName] || moduleName
  }
  
  // Helper function to translate action names
  const translateActionName = (actionName: string): string => {
    const actionTranslations: Record<string, string> = {
      'View': t('admin.permissions.action.view'),
      'Create': t('admin.permissions.action.create'),
      'Update': t('admin.permissions.action.update'),
      'Delete': t('admin.permissions.action.delete'),
      'Approve': t('admin.permissions.action.approve'),
      'Assign': t('admin.permissions.action.assign'),
      'Export': t('admin.permissions.action.export'),
      'Import': t('admin.permissions.action.import'),
      'Manage': t('admin.permissions.action.manage'),
    }
    return actionTranslations[actionName] || actionName
  }
  
  // Helper function to translate module descriptions
  const translateModuleDescription = (description: string): string => {
    const descriptionTranslations: Record<string, string> = {
      'Overview and analytics': t('admin.permissions.module.dashboardDesc'),
      'Manage client information and profiles': t('admin.permissions.module.clientsDesc'),
      'Track and manage potential clients': t('admin.permissions.module.leadsDesc'),
      'Manage client applications': t('admin.permissions.module.applicationsDesc'),
      'Document management and approval': t('admin.permissions.module.documentsDesc'),
      'Manage staff and team members': t('admin.permissions.module.teamDesc'),
      'Financial overview and management': t('admin.permissions.module.financialDesc'),
      'Internal and client communications': t('admin.permissions.module.messagesDesc'),
      'Generate and view reports': t('admin.permissions.module.reportsDesc'),
      'System configuration and settings': t('admin.permissions.module.settingsDesc'),
      'Help documentation and support': t('admin.permissions.module.helpDesc'),
      'Manage user accounts and access': t('admin.permissions.module.userManagementDesc'),
      'Manage roles and permissions': t('admin.permissions.module.roleManagementDesc'),
      'Customer support and ticketing': t('admin.permissions.module.supportDesc'),
      'Task management and assignment': t('admin.permissions.module.tasksDesc'),
      'Invoice creation and management': t('admin.permissions.module.invoicesDesc'),
      'Payment processing and tracking': t('admin.permissions.module.paymentsDesc'),
      'Expense tracking and approval': t('admin.permissions.module.expensesDesc'),
      'Business analytics and insights': t('admin.permissions.module.analyticsDesc'),
    }
    return descriptionTranslations[description] || description
  }
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<PermissionModule[]>([])
  
  // Hidden modules that should not appear in the role creation form (matching sidebar)
  const hiddenModules = [Module.APPLICATIONS, Module.DOCUMENTS, Module.FINANCIAL, Module.REPORTS]
  
  // Filter permissions to exclude hidden modules
  const getVisiblePermissions = (perms: PermissionModule[]): PermissionModule[] => {
    return perms.filter(moduleData => {
      const moduleValue = moduleData.module as Module
      return !hiddenModules.includes(moduleValue)
    })
  }
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [viewingRole, setViewingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isRemovingUserRole, setIsRemovingUserRole] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  })

  // Component mount/unmount logging
  useEffect(() => {
    console.log('[RoleManagementPage] Component mounted')
    return () => {
      console.log('[RoleManagementPage] Component unmounted')
    }
  }, [])

  // Auth state logging
  useEffect(() => {
    console.log('[RoleManagementPage] Auth state changed:', {
      authLoading,
      hasUser: !!user,
      hasToken: !!token,
      userId: user?.id,
      userRole: user?.role,
      staffType: user?.staffType,
      userEmail: user?.email,
      permissionsCount: user?.permissions?.length || 0,
      permissions: user?.permissions || []
    })
  }, [user, token, authLoading])

  // Redirect if not logged in or not authorized
  useEffect(() => {
    console.log('[RoleManagementPage] Checking authorization...', {
      authLoading,
      hasUser: !!user,
      hasToken: !!token,
      userRole: user?.role,
      userPermissions: user?.permissions || [],
      hasRoleManagementView: user?.permissions?.includes('role_management.view') || false
    })

    if (!authLoading && (!user || user.role !== 'STAFF')) {
      console.warn('[RoleManagementPage] Authorization failed - redirecting to login', {
        reason: !user ? 'No user' : 'Not STAFF',
        userRole: user?.role
      })
      router.push('/admin/login')
      return
    }
    
    // Check if user has role management permission
    if (!authLoading && user && user.role === 'STAFF') {
      const userPermissions = user.permissions || []
      const hasPermission = userPermissions.includes('role_management.view')
      
      console.log('[RoleManagementPage] Permission check:', {
        hasPermission,
        userPermissions,
        requiredPermission: 'role_management.view'
      })

      if (!hasPermission) {
        console.warn('[RoleManagementPage] Permission check failed - redirecting to dashboard', {
          userPermissions,
          requiredPermission: 'role_management.view'
        })
        router.push('/admin/dashboard')
      } else {
        console.log('[RoleManagementPage] Permission check passed')
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    console.log('[RoleManagementPage] Data fetch effect triggered', {
      authLoading,
      hasToken: !!token,
      hasUser: !!user,
      userRole: user?.role,
      shouldFetch: !authLoading && user?.role === 'STAFF'
    })

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[RoleManagementPage] Auth still loading, waiting...')
      return
    }

    // Check if user is STAFF (token is managed by NextAuth, so we don't need to check it)
    if (user?.role === 'STAFF') {
      console.log('[RoleManagementPage] Conditions met, fetching data...')
      fetchRoles()
      fetchPermissions()
    } else {
      console.log('[RoleManagementPage] Conditions not met, skipping fetch', {
        hasUser: !!user,
        userRole: user?.role,
        authLoading
      })
      // If auth is done but user is not STAFF, set loading to false to show content
      if (!authLoading) {
        console.log('[RoleManagementPage] Auth done but user not STAFF, setting loading to false')
        setLoading(false)
      }
    }
  }, [authLoading, user])

  const fetchRoles = async () => {
    const startTime = Date.now()
    // Get token from localStorage (NextAuth manages auth via cookies, but API might need token)
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    
    console.log('[RoleManagementPage] fetchRoles() called', {
      hasTokenFromContext: !!token,
      hasTokenFromStorage: !!authToken,
      tokenLength: authToken?.length || 0,
      timestamp: new Date().toISOString()
    })
    
    try {
      setLoading(true)
      console.log('[RoleManagementPage] Fetching roles from API...', {
        endpoint: '/api/roles',
        method: 'GET',
        hasAuthToken: !!authToken
      })

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.get('/api/roles', { headers })

      const duration = Date.now() - startTime
      console.log('[RoleManagementPage] Roles API response received', {
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
      console.log('[RoleManagementPage] Processed roles data', {
        rolesCount: roles.length,
        roles: roles.map((r: Role) => {
          let permissionsCount = 0
          // permissions is always a string (JSON string) according to Role interface
          try {
            const parsed = JSON.parse(r.permissions || '[]')
            permissionsCount = Array.isArray(parsed) ? parsed.length : 0
          } catch {
            permissionsCount = 0
          }
          
          return {
            id: r.id,
            name: r.name,
            permissionsCount,
            isProtected: r.isProtected,
            isDefault: r.isDefault,
            isActive: r.isActive,
            usersCount: r._count?.users || 0
          }
        })
      })

      setRoles(roles)
      console.log('[RoleManagementPage] Roles state updated successfully', {
        rolesCount: roles.length
      })
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RoleManagementPage] Error fetching roles:', {
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
      toast.error('Failed to fetch roles')
    } finally {
      setLoading(false)
      console.log('[RoleManagementPage] fetchRoles() completed, loading set to false')
    }
  }

  const fetchPermissions = async () => {
    const startTime = Date.now()
    // Get token from localStorage (NextAuth manages auth via cookies, but API might need token)
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    
    console.log('[RoleManagementPage] fetchPermissions() called', {
      hasTokenFromContext: !!token,
      hasTokenFromStorage: !!authToken,
      timestamp: new Date().toISOString()
    })
    
    try {
      console.log('[RoleManagementPage] Fetching permissions from API...', {
        endpoint: '/api/roles/permissions',
        method: 'GET',
        hasAuthToken: !!authToken
      })

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.get('/api/roles/permissions', { headers })

      const duration = Date.now() - startTime
      console.log('[RoleManagementPage] Permissions API response received', {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        responseStructure: {
          hasData: !!response.data,
          hasPermissionsByModule: !!response.data?.permissionsByModule,
          dataKeys: Object.keys(response.data || {})
        },
        permissionsByModuleCount: response.data?.permissionsByModule?.length || 0
      })

      const permissionsData: PermissionModule[] = Array.isArray(response.data.permissionsByModule) 
        ? response.data.permissionsByModule 
        : []
      
      console.log('[RoleManagementPage] Processed permissions data', {
        modulesCount: permissionsData.length,
        modules: permissionsData.map((m: PermissionModule) => ({
          module: m.module,
          permissionsCount: Array.isArray(m.permissions) ? m.permissions.length : 0
        }))
      })

      setPermissions(permissionsData)
      console.log('[RoleManagementPage] Permissions state updated successfully', {
        modulesCount: permissionsData.length
      })
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RoleManagementPage] Error fetching permissions:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
      toast.error('Failed to fetch permissions')
      setPermissions([]) // Set empty array as fallback
      console.log('[RoleManagementPage] Permissions set to empty array as fallback')
    }
  }

  const handleCreateRole = async () => {
    const startTime = Date.now()
    console.log('[RoleManagementPage] handleCreateRole() called', {
      formData: {
        name: formData.name,
        description: formData.description,
        permissionsCount: formData.permissions.length
      },
      selectedPermissionsCount: selectedPermissions.length,
      selectedPermissions: selectedPermissions,
      timestamp: new Date().toISOString()
    })

    // Validate form data
    if (!formData.name.trim()) {
      console.warn('[RoleManagementPage] Create role validation failed: name is empty')
      toast.error('Role name is required')
      return
    }

    if (selectedPermissions.length === 0) {
      console.warn('[RoleManagementPage] Create role validation failed: no permissions selected')
      toast.error('At least one permission must be selected')
      return
    }

    console.log('[RoleManagementPage] Validation passed, creating role...')
    setIsCreating(true)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: selectedPermissions
      }

      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      console.log('[RoleManagementPage] Creating role via API...', {
        hasTokenFromContext: !!token,
        hasTokenFromStorage: !!authToken,
        endpoint: '/api/roles',
        method: 'POST',
        payload
      })

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.post('/api/roles', payload, { headers })

      const duration = Date.now() - startTime
      console.log('[RoleManagementPage] Role created successfully', {
        status: response.status,
        responseData: response.data,
        duration: `${duration}ms`,
        createdRole: response.data?.role || response.data?.data?.role
      })

      toast.success('Role created successfully')
      setIsCreateDialogOpen(false)
      setFormData({ name: '', description: '', permissions: [] })
      setSelectedPermissions([])
      console.log('[RoleManagementPage] Dialog closed and form reset')
      
      console.log('[RoleManagementPage] Refreshing roles list...')
      fetchRoles()
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RoleManagementPage] Error creating role:', {
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
        selectedPermissions,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
      toast.error(error.response?.data?.error || 'Failed to create role')
    } finally {
      setIsCreating(false)
      console.log('[RoleManagementPage] Create operation completed, isCreating set to false')
    }
  }

  const handleEditRole = async () => {
    const startTime = Date.now()
    console.log('[RoleManagementPage] handleEditRole() called', {
      editingRole: editingRole ? {
        id: editingRole.id,
        name: editingRole.name,
        isProtected: editingRole.isProtected
      } : null,
      formData: {
        name: formData.name,
        description: formData.description,
        permissionsCount: formData.permissions.length
      },
      selectedPermissionsCount: selectedPermissions.length,
      selectedPermissions: selectedPermissions,
      timestamp: new Date().toISOString()
    })

    if (!editingRole) {
      console.warn('[RoleManagementPage] Update role failed: no editing role')
      return
    }

    // Validate form data
    if (!formData.name.trim()) {
      console.warn('[RoleManagementPage] Update role validation failed: name is empty')
      toast.error('Role name is required')
      return
    }

    if (selectedPermissions.length === 0) {
      console.warn('[RoleManagementPage] Update role validation failed: no permissions selected')
      toast.error('At least one permission must be selected')
      return
    }

    console.log('[RoleManagementPage] Validation passed, updating role...')
    setIsUpdating(true)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: selectedPermissions
      }

      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      console.log('[RoleManagementPage] Updating role via API...', {
        hasTokenFromContext: !!token,
        hasTokenFromStorage: !!authToken,
        endpoint: `/api/roles/${editingRole.id}`,
        method: 'PUT',
        roleId: editingRole.id,
        payload
      })

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.put(`/api/roles/${editingRole.id}`, payload, { headers })

      const duration = Date.now() - startTime
      console.log('[RoleManagementPage] Role updated successfully', {
        status: response.status,
        responseData: response.data,
        duration: `${duration}ms`,
        updatedRole: response.data?.role || response.data?.data?.role
      })

      toast.success('Role updated successfully')
      setIsEditDialogOpen(false)
      setEditingRole(null)
      setFormData({ name: '', description: '', permissions: [] })
      setSelectedPermissions([])
      console.log('[RoleManagementPage] Dialog closed and form reset')
      
      console.log('[RoleManagementPage] Refreshing roles list...')
      fetchRoles()
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RoleManagementPage] Error updating role:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        duration: `${duration}ms`,
        roleId: editingRole?.id,
        formData,
        selectedPermissions,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
      toast.error(error.response?.data?.error || 'Failed to update role')
    } finally {
      setIsUpdating(false)
      console.log('[RoleManagementPage] Update operation completed, isUpdating set to false')
    }
  }

  const openDeleteDialog = (role: Role) => {
    setDeletingRole(role)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteRole = async () => {
    const startTime = Date.now()
    console.log('[RoleManagementPage] handleDeleteRole() called', {
      deletingRole: deletingRole ? {
        id: deletingRole.id,
        name: deletingRole.name,
        isProtected: deletingRole.isProtected,
        usersCount: deletingRole._count?.users || 0
      } : null,
      timestamp: new Date().toISOString()
    })

    if (!deletingRole) {
      console.warn('[RoleManagementPage] Delete role failed: no deleting role')
      return
    }
    
    // Check if role has users assigned
    const usersCount = deletingRole._count?.users || 0
    if (usersCount > 0) {
      console.warn('[RoleManagementPage] Delete role failed: role has assigned users', {
        roleName: deletingRole.name,
        usersCount
      })
      toast.error(`Cannot delete role "${deletingRole.name}" because it has ${usersCount} user(s) assigned to it. Please reassign users first.`)
      setIsDeleteDialogOpen(false)
      setDeletingRole(null)
      return
    }

    console.log('[RoleManagementPage] Validation passed, deleting role...')
    setIsDeleting(true)

    try {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      console.log('[RoleManagementPage] Deleting role via API...', {
        hasTokenFromContext: !!token,
        hasTokenFromStorage: !!authToken,
        endpoint: `/api/roles/${deletingRole.id}`,
        method: 'DELETE',
        roleId: deletingRole.id
      })

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.delete(`/api/roles/${deletingRole.id}`, { headers })

      const duration = Date.now() - startTime
      console.log('[RoleManagementPage] Role deleted successfully', {
        status: response.status,
        responseData: response.data,
        duration: `${duration}ms`,
        roleId: deletingRole.id
      })

      toast.success('Role deleted successfully')
      setIsDeleteDialogOpen(false)
      setDeletingRole(null)
      console.log('[RoleManagementPage] Dialog closed')
      
      console.log('[RoleManagementPage] Refreshing roles list...')
      fetchRoles()
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RoleManagementPage] Error deleting role:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        duration: `${duration}ms`,
        roleId: deletingRole?.id,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
      toast.error(error.response?.data?.error || 'Failed to delete role')
    } finally {
      setIsDeleting(false)
      console.log('[RoleManagementPage] Delete operation completed, isDeleting set to false')
    }
  }

  const openEditDialog = (role: Role) => {
    console.log('[RoleManagementPage] openEditDialog() called', {
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissionsString: role.permissions,
        isProtected: role.isProtected
      }
    })

    try {
      const parsedPermissions = JSON.parse(role.permissions || '[]')
      const permissions: string[] = Array.isArray(parsedPermissions) ? parsedPermissions : []
      
      console.log('[RoleManagementPage] Parsed permissions for edit', {
        permissionsCount: permissions.length,
        permissions
      })

      setEditingRole(role)
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: permissions
      })
      setSelectedPermissions(permissions)
      setIsEditDialogOpen(true)
      console.log('[RoleManagementPage] Edit dialog opened, form data set')
    } catch (error: any) {
      console.error('[RoleManagementPage] Error parsing permissions in openEditDialog:', {
        error,
        errorMessage: error?.message,
        permissionsString: role.permissions,
        roleId: role.id
      })
      toast.error('Failed to parse role permissions')
      // Set empty arrays as fallback
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: []
      })
      setSelectedPermissions([])
    }
  }

  const openViewDialog = async (role: Role) => {
    console.log('[RoleManagementPage] openViewDialog() called', {
      role: {
        id: role.id,
        name: role.name,
        usersCount: role._count?.users || 0
      }
    })

    setViewingRole(role)
    setIsViewDialogOpen(true)
    console.log('[RoleManagementPage] View dialog opened, fetching assigned users...')
    await fetchAssignedUsers(role.id)
  }

  const fetchAssignedUsers = async (roleId: string) => {
    const startTime = Date.now()
    console.log('[RoleManagementPage] fetchAssignedUsers() called', {
      roleId,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    })

    try {
      setLoadingUsers(true)
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      console.log('[RoleManagementPage] Fetching assigned users from API...', {
        hasTokenFromContext: !!token,
        hasTokenFromStorage: !!authToken,
        endpoint: `/api/roles/${roleId}/users`,
        method: 'GET',
        roleId
      })

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.get(`/api/roles/${roleId}/users`, { headers })

      const duration = Date.now() - startTime
      console.log('[RoleManagementPage] Assigned users API response received', {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        responseStructure: {
          hasData: !!response.data,
          hasDataData: !!response.data?.data,
          hasDataDataUsers: !!response.data?.data?.users,
          hasDataUsers: !!response.data?.users
        }
      })

      // Handle structured response format: { success: true, data: { users: [...] } }
      const usersData = response.data?.data?.users || response.data?.users || []
      const users: AssignedUser[] = Array.isArray(usersData) ? usersData : []
      
      console.log('[RoleManagementPage] Processed assigned users data', {
        usersCount: users.length,
        users: users.map((u: AssignedUser) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          staffType: u.staffType,
          isActive: u.isActive
        }))
      })

      setAssignedUsers(users)
      console.log('[RoleManagementPage] Assigned users state updated successfully', {
        usersCount: users.length
      })
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RoleManagementPage] Error fetching assigned users:', {
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
      toast.error('Failed to fetch assigned users')
      setAssignedUsers([])
      console.log('[RoleManagementPage] Assigned users set to empty array as fallback')
    } finally {
      setLoadingUsers(false)
      console.log('[RoleManagementPage] fetchAssignedUsers() completed, loadingUsers set to false')
    }
  }

  const handleRemoveUserRole = async (userId: string) => {
    const startTime = Date.now()
    console.log('[RoleManagementPage] handleRemoveUserRole() called', {
      userId,
      viewingRoleId: viewingRole?.id,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    })

    setIsRemovingUserRole(true)
    try {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      console.log('[RoleManagementPage] Removing user role via API...', {
        hasTokenFromContext: !!token,
        hasTokenFromStorage: !!authToken,
        endpoint: `/api/users/${userId}/role`,
        method: 'DELETE',
        userId
      })

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const response = await axios.delete(`/api/users/${userId}/role`, { headers })

      const duration = Date.now() - startTime
      console.log('[RoleManagementPage] User role removed successfully', {
        status: response.status,
        responseData: response.data,
        duration: `${duration}ms`,
        userId
      })

      toast.success('User role removed successfully')
      
      // Refresh the assigned users list
      if (viewingRole) {
        console.log('[RoleManagementPage] Refreshing assigned users list...', {
          roleId: viewingRole.id
        })
        await fetchAssignedUsers(viewingRole.id)
      }
      
      // Refresh the roles list to update user counts
      console.log('[RoleManagementPage] Refreshing roles list...')
      fetchRoles()
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[RoleManagementPage] Error removing user role:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorResponse: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        duration: `${duration}ms`,
        userId,
        timestamp: new Date().toISOString(),
        stack: error?.stack
      })
      toast.error(error.response?.data?.error || 'Failed to remove user role')
    } finally {
      setIsRemovingUserRole(false)
      console.log('[RoleManagementPage] Remove user role operation completed, isRemovingUserRole set to false')
    }
  }

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    )
  }

  const selectAllPermissions = () => {
    const allPermissions = getVisiblePermissions(permissions).flatMap(p => p.permissions.map(perm => perm.permission))
    setSelectedPermissions(allPermissions)
  }

  const clearAllPermissions = () => {
    setSelectedPermissions([])
  }

  // Loading state logging
  useEffect(() => {
    console.log('[RoleManagementPage] Loading state changed', {
      authLoading,
      loading,
      rolesCount: roles.length,
      permissionsCount: permissions.length,
      isShowingLoading: authLoading || loading
    })
  }, [authLoading, loading, roles.length, permissions.length])

  if (authLoading || loading) {
    console.log('[RoleManagementPage] Rendering loading state', {
      authLoading,
      loading
    })
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  if (!user || user.role !== 'STAFF') {
    console.warn('[RoleManagementPage] Rendering null - user check failed', {
      hasUser: !!user,
      userRole: user?.role
    })
    return null
  }

  console.log('[RoleManagementPage] Rendering main content', {
    rolesCount: roles.length,
    permissionsCount: permissions.length,
    isCreateDialogOpen,
    isEditDialogOpen,
    isViewDialogOpen,
    isDeleteDialogOpen,
    hasEditingRole: !!editingRole,
    hasViewingRole: !!viewingRole,
    hasDeletingRole: !!deletingRole
  })

  return (
    <div className="h-screen bg-gray-50 dark:bg-background flex overflow-hidden">
      <PermissionAwareSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-card border-b dark:border-border">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">{t('admin.roles.title')}</h1>
                <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('admin.roles.manageForStaff') || 'Manage roles for staff members'}</p>
              </div>
              <div className="flex items-center space-x-4">
                <LanguageSwitcher />
                <ThemeSwitcher />
                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('admin.roles.allRoles')}</h2>
                <p className="text-sm text-gray-600">{t('admin.roles.createAndManage') || 'Create and manage custom roles'}</p>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.roles.createRole')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('admin.roles.createNewRole')}</DialogTitle>
                    <DialogDescription>
                      {t('admin.roles.createNewRoleDesc') || 'Create a new role with specific permissions for staff members.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">{t('admin.roles.roleName')}</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder={t('admin.roles.roleNamePlaceholder') || 'e.g., Senior Manager'}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">{t('common.description')}</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder={t('admin.roles.descriptionPlaceholder') || 'Brief description of the role'}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <Label>{t('admin.roles.permissions')}</Label>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm" onClick={selectAllPermissions}>
                            {t('admin.roles.selectAll') || 'Select All'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={clearAllPermissions}>
                            {t('admin.roles.clearAll') || 'Clear All'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                        {permissions && permissions.length > 0 ? (
                          <div className="space-y-4">
                            {getVisiblePermissions(permissions).map((moduleData) => (
                              <div key={moduleData.module} className="space-y-2">
                                <div className="flex items-center space-x-2 pb-2 border-b">
                                  <Shield className="h-4 w-4 text-gray-600" />
                                  <div>
                                    <h4 className="font-medium text-sm">{moduleData.moduleInfo?.name ? translateModuleName(moduleData.moduleInfo.name) : moduleData.module}</h4>
                                    <p className="text-xs text-gray-500">{moduleData.moduleInfo?.description ? translateModuleDescription(moduleData.moduleInfo.description) : ''}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                                  {moduleData.permissions?.map((permission: PermissionItem) => (
                                    <div key={permission.permission} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={permission.permission}
                                        checked={selectedPermissions.includes(permission.permission)}
                                        onCheckedChange={() => togglePermission(permission.permission)}
                                      />
                                      <Label htmlFor={permission.permission} className="text-xs cursor-pointer">
                                        {permission.actionInfo?.name ? translateActionName(permission.actionInfo.name) : permission.action}
                                      </Label>
                                    </div>
                                  )) || []}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            {t('admin.roles.noPermissionsAvailable') || 'No permissions available'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button 
                      onClick={handleCreateRole}
                      disabled={isCreating}
                    >
                      {isCreating ? t('admin.roles.creating') || 'Creating...' : t('admin.roles.createRole')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Roles Table */}
            <Card>
                  <CardHeader>
                <CardTitle>{t('admin.roles.allRoles')}</CardTitle>
                <CardDescription>{t('admin.roles.manageSystemRoles') || 'Manage system roles'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.roles.roleName')}</TableHead>
                        <TableHead>{t('common.description')}</TableHead>
                        <TableHead>{t('admin.roles.users')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.length > 0 ? roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium">{translateRoleName(role.name)}</div>
                              </div>
                    </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {role.description ? translateRoleDescription(role.description) : (t('admin.roles.noDescription') || 'No description')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Users className="h-4 w-4 mr-1 text-gray-400" />
                              {formatNumber(role._count?.users || 0)}
                      </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={role.isActive ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {role.isActive ? t('admin.clients.active') : t('admin.clients.inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <AlertDialog open={isDeleteDialogOpen && deletingRole?.id === role.id} onOpenChange={(open) => {
                                if (!open) {
                                  setIsDeleteDialogOpen(false)
                                  setDeletingRole(null)
                                }
                              }}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => openViewDialog(role)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      {t('common.view')}
                                    </DropdownMenuItem>
                                    {!role.isProtected && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => openEditDialog(role)}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          {t('common.edit')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                            onClick={() => openDeleteDialog(role)}
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {t('common.delete')}
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('admin.roles.deleteRole')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('admin.roles.deleteConfirm')} "{translateRoleName(role.name)}"? {t('admin.roles.cannotUndo')}
                                  {(role._count?.users || 0) > 0 && (
                                    <span className="block mt-2 text-red-600 font-medium">
                                      {t('admin.roles.warning')}: {t('admin.roles.roleHasUsers') || 'This role has'} {formatNumber(role._count?.users || 0)} {t('admin.roles.usersAssigned') || 'user(s) assigned to it'}.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteRole}
                                  disabled={isDeleting || (role._count?.users || 0) > 0}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {isDeleting ? t('admin.roles.deleting') || 'Deleting...' : t('admin.roles.deleteRole')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            <div className="flex flex-col items-center space-y-2">
                              <Shield className="h-8 w-8 text-gray-300" />
                              <p>{t('admin.roles.noRolesFound') || 'No roles found'}</p>
                              <p className="text-sm">{t('admin.roles.createFirstRole') || 'Create your first role to get started'}</p>
                        </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                    </div>
                  </CardContent>
                </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('admin.roles.editRole')}</DialogTitle>
                  <DialogDescription>
                    {t('admin.roles.updateRoleDesc') || 'Update role permissions and settings.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">{t('admin.roles.roleName')}</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('admin.roles.roleNamePlaceholder')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">{t('common.description')}</Label>
                      <Input
                        id="edit-description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder={t('admin.roles.descriptionPlaceholder')}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label>{t('admin.roles.permissions')}</Label>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={selectAllPermissions}>
                          {t('admin.roles.selectAll')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAllPermissions}>
                          {t('admin.roles.clearAll')}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                      {permissions && permissions.length > 0 ? (
                        <div className="space-y-4">
                          {getVisiblePermissions(permissions).map((moduleData) => (
                            <div key={moduleData.module} className="space-y-2">
                              <div className="flex items-center space-x-2 pb-2 border-b">
                                <Shield className="h-4 w-4 text-gray-600" />
                                <div>
                                  <h4 className="font-medium text-sm">{moduleData.moduleInfo?.name ? translateModuleName(moduleData.moduleInfo.name) : moduleData.module}</h4>
                                  <p className="text-xs text-gray-500">{moduleData.moduleInfo?.description || ''}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                                {moduleData.permissions?.map((permission) => (
                                  <div key={permission.permission} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-${permission.permission}`}
                                      checked={selectedPermissions.includes(permission.permission)}
                                      onCheckedChange={() => togglePermission(permission.permission)}
                                    />
                                    <Label htmlFor={`edit-${permission.permission}`} className="text-xs cursor-pointer">
                                      {permission.actionInfo?.name ? translateActionName(permission.actionInfo.name) : permission.action}
                                    </Label>
                                  </div>
                                )) || []}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {t('admin.roles.noPermissionsAvailable')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditDialogOpen(false)}
                      disabled={isUpdating}
                    >
                    {t('common.cancel')}
                  </Button>
                    <Button 
                      onClick={handleEditRole}
                      disabled={isUpdating}
                    >
                      {isUpdating ? t('admin.roles.updating') || 'Updating...' : t('admin.roles.updateRole')}
                    </Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* View Role Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>{t('admin.roles.roleDetails') || 'Role Details'}: {viewingRole ? translateRoleName(viewingRole.name) : ''}</span>
                  </DialogTitle>
                  <DialogDescription>
                    {t('admin.roles.viewRoleDesc') || 'View detailed information about this role and its permissions'}
                  </DialogDescription>
                </DialogHeader>

                {viewingRole && (
                  <div className="space-y-6">
                    {/* Role Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('admin.roles.roleName')}</Label>
                        <div className="p-3 bg-gray-50 rounded-md">
                          {translateRoleName(viewingRole.name)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('common.status')}</Label>
                        <div className="p-3 bg-gray-50 rounded-md">
                          <Badge 
                            variant={viewingRole.isActive ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {viewingRole.isActive ? t('admin.clients.active') : t('admin.clients.inactive')}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('admin.roles.assignedUsers') || 'Assigned Users'}</Label>
                        <div className="p-3 bg-gray-50 rounded-md flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{formatNumber(viewingRole._count?.users || 0)} {t('admin.roles.users')}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('admin.roles.totalPermissions') || 'Total Permissions'}</Label>
                        <div className="p-3 bg-gray-50 rounded-md">
                          {(() => {
                            try {
                              const parsed = JSON.parse(viewingRole.permissions || '[]')
                              return formatNumber(Array.isArray(parsed) ? parsed.length : 0)
                            } catch {
                              return formatNumber(0)
                            }
                          })()} {t('admin.roles.permissions')}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('common.description')}</Label>
                      <div className="p-3 bg-gray-50 rounded-md">
                        {viewingRole.description ? translateRoleDescription(viewingRole.description) : (t('admin.roles.noDescriptionProvided') || 'No description provided')}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">{t('admin.roles.permissions') || 'Permissions'}</Label>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {permissions && permissions.length > 0 ? getVisiblePermissions(permissions).map((moduleData) => {
                          let modulePermissions: string[] = []
                          try {
                            const parsed = JSON.parse(viewingRole.permissions || '[]')
                            modulePermissions = Array.isArray(parsed) ? parsed : []
                           } catch {
                            modulePermissions = []
                          }
                          const hasModulePermissions = moduleData.permissions?.some((p: PermissionItem) => 
                            modulePermissions.includes(p.permission)
                          )
                          
                          if (!hasModulePermissions) return null
                          
                          return (
                            <div key={moduleData.module} className="border rounded-lg p-4">
                              <div className="flex items-center space-x-2 pb-3 border-b">
                                <Shield className="h-4 w-4 text-gray-600" />
                                <div>
                                  <h4 className="font-medium text-sm">{moduleData.moduleInfo?.name ? translateModuleName(moduleData.moduleInfo.name) : moduleData.module}</h4>
                                  <p className="text-xs text-gray-500">{moduleData.moduleInfo?.description || ''}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 ml-6">
                                {moduleData.permissions?.filter((permission: PermissionItem) => 
                                  modulePermissions.includes(permission.permission)
                                ).map((permission: PermissionItem) => (
                                  <div key={permission.permission} className="flex items-center space-x-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-xs">
                                      {permission.actionInfo?.name ? translateActionName(permission.actionInfo.name) : permission.action}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }) : (
                          <div className="text-center py-8 text-gray-500">
                            {t('admin.roles.noPermissionsAvailable')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Users */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">{t('admin.roles.assignedUsers') || 'Assigned Users'}</Label>
                      <div className="border rounded-lg">
                        {loadingUsers ? (
                          <div className="text-center py-8 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
                            {t('admin.roles.loadingAssignedUsers') || 'Loading assigned users...'}
                          </div>
                        ) : assignedUsers.length > 0 ? (
                          <div className="divide-y">
                            {assignedUsers.map((user) => (
                              <div key={user.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <Users className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">{user.name || t('admin.roles.unknownUser') || 'Unknown User'}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                    <div className="text-xs text-gray-400">
                                      {user.staffType?.replace('_', ' ') || t('common.n/a')} • 
                                      {user.isActive !== undefined ? (user.isActive ? ' ' + t('admin.clients.active') : ' ' + t('admin.clients.inactive')) : ' ' + (t('admin.roles.unknown') || 'Unknown')}
                                    </div>
                                  </div>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      disabled={isRemovingUserRole}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      {t('common.remove')}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('admin.roles.removeUserFromRole') || 'Remove User from Role'}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('admin.roles.removeUserConfirm') || 'Are you sure you want to remove'} "{user.name}" {t('admin.roles.fromRole') || 'from the role'} "{viewingRole ? translateRoleName(viewingRole.name) : ''}"? {t('admin.roles.revokePermissions') || 'This will revoke all custom permissions assigned to this user.'}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isRemovingUserRole}>{t('common.cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRemoveUserRole(user.id)}
                                        disabled={isRemovingUserRole}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        {isRemovingUserRole ? t('admin.roles.removing') || 'Removing...' : t('admin.roles.removeUser') || 'Remove User'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p>{t('admin.roles.noUsersAssigned') || 'No users assigned to this role'}</p>
                            <p className="text-sm">{t('admin.roles.assignFromTeamPage') || 'Users can be assigned to this role from the team management page'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    {t('common.close')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}