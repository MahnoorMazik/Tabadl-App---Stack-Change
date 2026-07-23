'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { Tag, Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/LocaleContext'

// Helper function to replace placeholders in strings
function replaceParams(str: string, params: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

type LeadStatusType = 'OPEN' | 'WON' | 'LOST' | 'OTHER'

interface LeadStatus {
  id: string
  name: string
  color: string
  type: LeadStatusType
  createdAt: string
  _count?: { leads: number }
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

export default function LeadStatusesPage() {
  const { token, loading: authLoading } = useAuth()
  const { t, formatNumber } = useLocale()
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [loading, setLoading] = useState(false)

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null)

  const [form, setForm] = useState<{ name: string; color: string; type: LeadStatusType }>({
    name: '',
    color: '#6366f1',
    type: 'OPEN',
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingStatus, setDeletingStatus] = useState<LeadStatus | null>(null)
  const [targetStatusId, setTargetStatusId] = useState<string>('')

  const fetchStatuses = useCallback(async () => {
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    
    setLoading(true)
    try {
      const response = await axios.get('/api/lead-statuses', {
        headers,
        withCredentials: true,
      })
      const list = response.data?.statuses || []
      setStatuses(list)
    } catch (error) {
      const isUnauthorized =
        axios.isAxiosError(error) && error.response?.status === 401
      console.error('Error fetching lead statuses:', error)
      toast({
        title: t('common.error'),
        description:
          isUnauthorized
            ? t('auth.sessionExpired') || 'Your session has expired. Please log in again.'
            : t('admin.leads.statuses.fetchFailed') || 'Failed to fetch lead statuses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!authLoading) {
      fetchStatuses()
    }
  }, [authLoading, fetchStatuses])

  const resetForm = () => {
    setForm({
      name: '',
      color: '#6366f1',
      type: 'OPEN',
    })
    setEditingStatus(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setShowEditDialog(true)
  }

  const openEditDialog = (status: LeadStatus) => {
    setEditingStatus(status)
    setForm({
      name: status.name,
      color: status.color,
      type: status.type,
    })
    setShowEditDialog(true)
  }

  const handleSaveStatus = async () => {
    if (!form.name.trim()) {
      toast({
        title: t('common.validationError') || 'Validation error',
        description: t('admin.leads.statuses.nameRequired') || 'Status name is required',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingStatus) {
        await axios.put(
          `/api/lead-statuses/${editingStatus.id}`,
          {
            name: form.name.trim(),
            color: form.color,
            type: form.type,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )
        toast({ title: t('common.success'), description: t('admin.leads.statuses.statusUpdated') || 'Status updated' })
      } else {
        await axios.post(
          '/api/lead-statuses',
          {
            name: form.name.trim(),
            color: form.color,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        )
        toast({ title: t('common.success'), description: t('admin.leads.statuses.statusCreated') || 'Status created' })
      }

      setShowEditDialog(false)
      resetForm()
      fetchStatuses()
    } catch (error: any) {
      console.error('Error saving lead status:', error)
      toast({
        title: t('common.error'),
        description:
          error?.response?.data?.error || t('admin.leads.statuses.saveFailed') || 'Failed to save lead status',
        variant: 'destructive',
      })
    }
  }

  const openDeleteStatusDialog = (status: LeadStatus) => {
    setDeletingStatus(status)
    setTargetStatusId('')
    setShowDeleteDialog(true)
  }

  const handleDeleteStatus = async () => {
    if (!deletingStatus) return

    try {
      await axios.delete(`/api/lead-statuses/${deletingStatus.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        data: targetStatusId ? { targetStatusId } : {},
      })

      toast({ title: t('common.success'), description: t('admin.leads.statuses.statusDeleted') || 'Status deleted' })
      setShowDeleteDialog(false)
      setDeletingStatus(null)
      setTargetStatusId('')
      fetchStatuses()
    } catch (error: any) {
      console.error('Error deleting lead status:', error)
      const leadCount = error?.response?.data?.leadCount
      toast({
        title: t('common.error'),
        description:
          error?.response?.data?.error ||
          (leadCount
            ? replaceParams(t('admin.leads.statuses.statusUsedByLeads') || 'This status is used by {count} leads. Please choose a status to move them to.', { count: formatNumber(leadCount) })
            : t('admin.leads.statuses.deleteFailed') || 'Failed to delete lead status'),
        variant: 'destructive',
      })
    }
  }

  const typeLabel: Record<LeadStatusType, string> = {
    OPEN: 'Open',
    WON: 'Won',
    LOST: 'Lost',
    OTHER: 'Other',
  }

  return (
    <AdminPageTemplate
      title={t('admin.leads.statuses.title') || 'Lead Statuses'}
      description={t('admin.leads.statuses.description') || 'Configure lead statuses and colors for your pipeline'}
      icon={<Tag className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-600">
            {t('admin.leads.statuses.usedForLeads') || 'These statuses are used for all leads and analytics.'}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.leads.statuses.addStatus') || 'Add Status'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('admin.leads.statuses.totalStatuses') || 'Total Statuses'}: {formatNumber(statuses.length)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              {t('admin.leads.statuses.loading') || 'Loading statuses...'}
            </div>
          ) : statuses.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {t('admin.leads.statuses.noStatuses') || 'No lead statuses defined yet. Click "Add Status" to create one.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statuses.map((status) => {
                const systemStatusNames = new Set(['New', 'Contacted', 'Qualified', 'Converted'])
                const isSystem = systemStatusNames.has(status.name)
                const leadCount = status._count?.leads ?? 0
                return (
                  <Card
                    key={status.id}
                    className="hover:shadow-lg transition-shadow overflow-hidden"
                    style={{ backgroundColor: status.color + '18', borderColor: status.color + '40', borderWidth: 1 }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </CardTitle>
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
                          <Tag className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {formatNumber(leadCount)} {leadCount !== 1 ? (t('admin.leads.leads') || 'leads') : (t('admin.leads.lead') || 'lead')}
                          </span>
                        </div>
                        <span
                          className="inline-flex items-center justify-center h-6 px-3 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: status.color }}
                        >
                          {status.name}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditDialog(status)}
                          disabled={isSystem}
                        >
                          <Edit2 className="h-3 w-3 mr-2" />
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-300 disabled:border-gray-200"
                          onClick={() => openDeleteStatusDialog(status)}
                          disabled={isSystem}
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
        </CardContent>
      </Card>

      {/* Create/Edit Status Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? t('admin.leads.statuses.editStatus') || 'Edit Lead Status' : t('admin.leads.statuses.addStatus') || 'Add Lead Status'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="status-name">{t('common.name')}</Label>
              <Input
                id="status-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t('admin.leads.statuses.namePlaceholder') || 'e.g. New, Contacted, Qualified'}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status-color">{t('admin.leads.statuses.color') || 'Color'}</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-10 rounded-lg border-2 transition-all ${
                      form.color === color.value
                        ? 'border-gray-900 scale-110'
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, color: color.value }))
                    }
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            {/* Type is fixed (OPEN for user-defined statuses, WON only for system Converted); no UI field needed */}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                resetForm()
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveStatus}>
              {editingStatus ? t('common.saveChanges') || 'Save Changes' : t('admin.leads.statuses.createStatus') || 'Create Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Status Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.leads.statuses.deleteStatus') || 'Delete Lead Status'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-700">
              {t('admin.leads.statuses.deleteConfirm') || 'Are you sure you want to delete the status'}{' '}
              <span className="font-semibold">
                {deletingStatus?.name || ''}
              </span>
              ? {t('admin.leads.statuses.deleteNote') || 'If this status is used by existing leads, you\'ll need to choose another status to move them to.'}
            </p>
            {statuses.length > 1 && deletingStatus && (
              <div>
                <Label>{t('admin.leads.statuses.reassignLeads') || 'Reassign leads to'}</Label>
                <Select
                  value={targetStatusId}
                  onValueChange={setTargetStatusId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('admin.leads.statuses.selectTargetStatus') || 'Select target status'} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses
                      .filter((s) => s.id !== deletingStatus.id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  {t('admin.leads.statuses.reassignNote') || 'All leads currently using'} &quot;{deletingStatus.name}&quot; {t('admin.leads.statuses.willBeUpdated') || 'will be updated to this status.'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeletingStatus(null)
                setTargetStatusId('')
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDeleteStatus}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('admin.leads.statuses.deleteStatus')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageTemplate>
  )
}


