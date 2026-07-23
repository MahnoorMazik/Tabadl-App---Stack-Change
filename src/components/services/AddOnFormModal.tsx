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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ServiceOption { id: string; name: string }

interface AddOnFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addOnId?: string | null
  onSuccess?: () => void
}

export function AddOnFormModal({ open, onOpenChange, addOnId, onSuccess }: AddOnFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!addOnId
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<ServiceOption[]>([])

  const [form, setForm] = useState({
    name: '',
    description: '',
    priceSar: 0,
    priceUsd: 0,
    serviceId: '',
    isActive: true,
    sortOrder: 0,
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
        const servicesRes = await axios.get('/api/admin/services', { headers: authHeaders() })
        setServices(
          (servicesRes.data.services ?? [])
            .filter((s: { isActive?: boolean }) => s.isActive !== false)
            .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
        )

        if (addOnId) {
          const res = await axios.get(`/api/admin/additional-services/${addOnId}`, { headers: authHeaders() })
          const a = res.data.addOn
          setForm({
            name: a.name,
            description: a.description ?? '',
            priceSar: a.priceSar,
            priceUsd: a.priceUsd,
            serviceId: a.serviceId ?? '',
            isActive: a.isActive,
            sortOrder: a.sortOrder,
          })
        } else {
          setForm({
            name: '',
            description: '',
            priceSar: 0,
            priceUsd: 0,
            serviceId: '',
            isActive: true,
            sortOrder: 0,
          })
        }
      } catch {
        toast({ title: 'Failed to load add-on', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, addOnId])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceSar: form.priceSar,
        priceUsd: form.priceUsd,
        serviceId: form.serviceId || null,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      }

      if (isEdit) {
        await axios.put(`/api/admin/additional-services/${addOnId}`, payload, { headers: authHeaders() })
        toast({ title: 'Add-on updated' })
      } else {
        await axios.post('/api/admin/additional-services', payload, { headers: authHeaders() })
        toast({ title: 'Add-on created' })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({ title: 'Failed to save add-on', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Add-on Service' : 'Add Add-on Service'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="addon-name">Name *</Label>
              <Input
                id="addon-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="addon-desc">Description</Label>
              <Textarea
                id="addon-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addon-sar">Price (SAR)</Label>
                <Input
                  id="addon-sar"
                  type="number"
                  min={0}
                  value={form.priceSar}
                  onChange={(e) => setForm({ ...form, priceSar: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="addon-usd">Price (USD)</Label>
                <Input
                  id="addon-usd"
                  type="number"
                  min={0}
                  value={form.priceUsd}
                  onChange={(e) => setForm({ ...form, priceUsd: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Link to Service (optional)</Label>
              <Select
                value={form.serviceId || '__none__'}
                onValueChange={(v) => setForm({ ...form, serviceId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Standalone add-on" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Standalone (no link)</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="addon-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="addon-active">Active</Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-emerald-700 hover:bg-emerald-800">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Add-on'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
