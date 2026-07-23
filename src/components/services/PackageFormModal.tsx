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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ServiceOption {
  id: string
  name: string
  sortOrder: number
  category: { id: string; name: string }
}

interface PackageFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageId?: string | null
  onSuccess?: () => void
}

export function PackageFormModal({ open, onOpenChange, packageId, onSuccess }: PackageFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!packageId
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allServices, setAllServices] = useState<ServiceOption[]>([])

  const [form, setForm] = useState({
    name: '',
    description: '',
    basePriceSar: 0,
    basePriceUsd: 0,
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
    serviceIds: [] as string[],
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
        const [servicesRes, packagesRes] = await Promise.all([
          axios.get('/api/admin/services', { headers: authHeaders() }),
          packageId
            ? axios.get(`/api/admin/service-packages/${packageId}`, { headers: authHeaders() })
            : Promise.resolve(null),
        ])

        setAllServices(
          (servicesRes.data.services ?? []).filter((s: ServiceOption & { isActive?: boolean }) => s.isActive !== false)
        )

        if (packagesRes) {
          const p = packagesRes.data.package
          setForm({
            name: p.name,
            description: p.description ?? '',
            basePriceSar: p.basePriceSar,
            basePriceUsd: p.basePriceUsd,
            isFeatured: p.isFeatured,
            isActive: p.isActive,
            sortOrder: p.sortOrder,
            serviceIds: p.serviceIds ?? [],
          })
        } else {
          setForm({
            name: '',
            description: '',
            basePriceSar: 0,
            basePriceUsd: 0,
            isFeatured: false,
            isActive: true,
            sortOrder: 0,
            serviceIds: [],
          })
        }
      } catch {
        toast({ title: 'Failed to load package', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, packageId])

  const toggleService = (serviceId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      serviceIds: checked
        ? [...prev.serviceIds, serviceId]
        : prev.serviceIds.filter((id) => id !== serviceId),
    }))
  }

  const groupedServices = allServices.reduce<Record<string, ServiceOption[]>>((acc, svc) => {
    const cat = svc.category?.name ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Package name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        basePriceSar: form.basePriceSar,
        basePriceUsd: form.basePriceUsd,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        serviceIds: form.serviceIds,
      }

      if (isEdit) {
        await axios.put(`/api/admin/service-packages/${packageId}`, payload, { headers: authHeaders() })
        toast({ title: 'Package updated' })
      } else {
        await axios.post('/api/admin/service-packages', payload, { headers: authHeaders() })
        toast({ title: 'Package created' })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({ title: 'Failed to save package', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Package' : 'Create Package'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pkg-name">Package Name *</Label>
              <Input
                id="pkg-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Professional Package"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pkg-desc">Description</Label>
              <Textarea
                id="pkg-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pkg-sar">Price (SAR) *</Label>
                <Input
                  id="pkg-sar"
                  type="number"
                  min={0}
                  value={form.basePriceSar}
                  onChange={(e) => setForm({ ...form, basePriceSar: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pkg-usd">Price (USD) *</Label>
                <Input
                  id="pkg-usd"
                  type="number"
                  min={0}
                  value={form.basePriceUsd}
                  onChange={(e) => setForm({ ...form, basePriceUsd: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="pkg-featured"
                  checked={form.isFeatured}
                  onCheckedChange={(v) => setForm({ ...form, isFeatured: v })}
                />
                <Label htmlFor="pkg-featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="pkg-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label htmlFor="pkg-active">Active</Label>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Included Services ({form.serviceIds.length} selected)</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-4">
                {Object.entries(groupedServices).map(([category, services]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{category}</p>
                    <div className="space-y-2">
                      {services.map((svc) => (
                        <div key={svc.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`svc-${svc.id}`}
                            checked={form.serviceIds.includes(svc.id)}
                            onCheckedChange={(checked) => toggleService(svc.id, checked === true)}
                          />
                          <Label htmlFor={`svc-${svc.id}`} className="font-normal cursor-pointer text-sm">
                            {svc.sortOrder}. {svc.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-emerald-700 hover:bg-emerald-800">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
