'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Plus, Edit, Trash2, Users } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'

interface ClientGroup {
  id: string
  name: string
  description?: string
  color: string
  _count: {
    clients: number
  }
}

const colorOptions = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#06b6d4', label: 'Cyan' },
]

export default function ClientGroupsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const { t, formatNumber } = useLocale()
  const [groups, setGroups] = useState<ClientGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
  })

  const fetchGroups = useCallback(async () => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    setLoading(true)
    try {
      const response = await axios.get('/api/client-groups', {
        headers,
        withCredentials: true,
      })
      setGroups(response.data.groups || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast({
        title: t('common.error'),
        description: t('admin.groups.failed').replace('{action}', 'fetch'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleCreate = async () => {
    try {
      await axios.post('/api/client-groups', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.groups.created'),
      })
      
      setShowCreateDialog(false)
      setFormData({ name: '', description: '', color: '#6366f1' })
      fetchGroups()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.groups.failed').replace('{action}', 'create'),
        variant: 'destructive',
      })
    }
  }

  const handleUpdate = async () => {
    if (!editingGroup) return

    try {
      await axios.put(`/api/client-groups/${editingGroup.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.groups.updated'),
      })
      
      setShowEditDialog(false)
      setEditingGroup(null)
      fetchGroups()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.groups.failed').replace('{action}', 'update'),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (group: ClientGroup) => {
    if (group._count.clients > 0) {
      toast({
        title: t('admin.groups.cannotDelete'),
        description: t('admin.groups.hasClients').replace('{count}', String(group._count.clients)),
        variant: 'destructive',
      })
      return
    }

    if (!confirm(t('admin.groups.deleteConfirm').replace('{name}', group.name))) {
      return
    }

    try {
      await axios.delete(`/api/client-groups/${group.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.groups.deleted'),
      })
      
      fetchGroups()
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('admin.groups.failed').replace('{action}', 'delete'),
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (group: ClientGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color,
    })
    setShowEditDialog(true)
  }

  return (
    <AdminPageTemplate
      title={t('admin.groups.title')}
      description={t('admin.groups.description')}
      icon={<FolderOpen className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              {t('admin.groups.totalGroups')}: <span className="font-semibold">{formatNumber(groups.length)}</span>
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.groups.createGroup')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.groups.createGroup')}</DialogTitle>
                <DialogDescription>
                  {t('admin.groups.createFirst')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('admin.groups.groupName')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('admin.groups.groupNamePlaceholder') || 'VIP Clients'}
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t('common.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('admin.groups.descriptionPlaceholder') || 'High priority clients with premium services'}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="color">{t('admin.groups.groupColor')}</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`h-10 rounded-lg border-2 transition-all ${
                          formData.color === color.value ? 'border-gray-900 scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
                  {t('admin.groups.createGroup')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups Grid - same card style as lead statuses */}
        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            {t('common.loading')}
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('admin.groups.noGroups')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t('admin.groups.createFirst')}</p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.groups.createFirstGroup')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const systemGroupNames = new Set(['Normal', 'Priority', 'Urgent'])
              const isSystem = systemGroupNames.has(group.name)
              const color = group.color || '#6b7280'
              const clientCount = group._count?.clients ?? 0
              return (
                <Card
                  key={group.id}
                  className="hover:shadow-lg transition-shadow overflow-hidden"
                  style={{ backgroundColor: color + '18', borderColor: color + '40', borderWidth: 1 }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          {group.name}
                        </CardTitle>
                        {group.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{group.description}</p>
                        )}
                      </div>
                      {isSystem && (
                        <span className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-full px-2 py-0.5 bg-white/60 dark:bg-black/20">
                          {t('admin.leads.statuses.systemGenerated') || 'System generated'}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {formatNumber(clientCount)} {clientCount !== 1 ? t('admin.groups.clients') : t('admin.groups.client')}
                        </span>
                      </div>
                      <span
                        className="inline-flex items-center justify-center h-6 px-3 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: color }}
                      >
                        {group.name}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(group)}
                        disabled={isSystem}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:text-gray-300 disabled:border-gray-200 dark:disabled:text-gray-600"
                        onClick={() => handleDelete(group)}
                        disabled={isSystem || clientCount > 0}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        {t('common.delete')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Edit Group Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.groups.editGroup')}</DialogTitle>
              <DialogDescription>
                {t('admin.groups.updateGroup')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t('admin.groups.groupName')} *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">{t('common.description')}</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-color">{t('admin.groups.groupColor')}</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`h-10 rounded-lg border-2 transition-all ${
                        formData.color === color.value ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700">
                {t('common.update')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageTemplate>
  )
}

