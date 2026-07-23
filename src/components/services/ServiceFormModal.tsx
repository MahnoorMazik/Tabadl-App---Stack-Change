'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Category { id: string; name: string }
interface PackageOption { id: string; name: string }

interface ServiceFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId?: string | null
  onSuccess?: () => void
}

export function ServiceFormModal({ open, onOpenChange, serviceId, onSuccess }: ServiceFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!serviceId
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [packages, setPackages] = useState<PackageOption[]>([])

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    sortOrder: 0,
    isActive: true,
    packageIds: [] as string[],
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
        const metaRes = await axios.get('/api/admin/services', { headers: authHeaders() })
        setCategories(metaRes.data.categories ?? [])
        setPackages(metaRes.data.packages ?? [])

        if (serviceId) {
          const res = await axios.get(`/api/admin/services/${serviceId}`, { headers: authHeaders() })
          const s = res.data.service
          setForm({
            name: s.name,
            description: s.description ?? '',
            categoryId: s.categoryId,
            sortOrder: s.sortOrder,
            isActive: s.isActive,
            packageIds: s.packageIds ?? [],
          })
        } else {
          setForm({
            name: '',
            description: '',
            categoryId: metaRes.data.categories?.[0]?.id ?? '',
            sortOrder: 0,
            isActive: true,
            packageIds: [],
          })
        }
      } catch {
        toast({ title: 'Failed to load service', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, serviceId])

  const togglePackage = (packageId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      packageIds: checked
        ? [...prev.packageIds, packageId]
        : prev.packageIds.filter((id) => id !== packageId),
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId) {
      toast({ title: 'Name and category are required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        categoryId: form.categoryId,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        packageIds: form.packageIds,
      }

      if (isEdit) {
        await axios.put(`/api/admin/services/${serviceId}`, payload, { headers: authHeaders() })
        toast({ title: 'Service updated' })
      } else {
        await axios.post('/api/admin/services', payload, { headers: authHeaders() })
        toast({ title: 'Service created' })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({ title: 'Failed to save service', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Service' : 'Add Service'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="svc-name">Service Name *</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Trade Name Reservation"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="svc-desc">Description</Label>
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="svc-order">Sort Order</Label>
                <Input
                  id="svc-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="svc-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="svc-active">Active</Label>
            </div>

            <div>
              <Label className="mb-2 block">Include in Packages (optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Leave all unchecked to keep this as a standalone service.
              </p>
              <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                {packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No packages available yet.</p>
                ) : (
                  packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`pkg-${pkg.id}`}
                        checked={form.packageIds.includes(pkg.id)}
                        onCheckedChange={(checked) => togglePackage(pkg.id, checked === true)}
                      />
                      <Label htmlFor={`pkg-${pkg.id}`} className="font-normal cursor-pointer">
                        {pkg.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-emerald-700 hover:bg-emerald-800">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
