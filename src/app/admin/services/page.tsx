'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { ServiceFormModal } from '@/components/services/ServiceFormModal'
import { Briefcase, Loader2, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'

interface ServiceItem {
  id: string
  name: string
  slug: string
  sortOrder: number
  isActive: boolean
  description: string | null
  category: { id: string; name: string }
  packages: Array<{ id: string; name: string }>
  packageIds: string[]
}

export default function ServicesCatalogPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const authHeaders = useCallback(() => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }, [token])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/services', { headers: authHeaders() })
      setServices(res.data.services ?? [])
    } catch {
      toast({ title: 'Failed to load services', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authHeaders, toast])

  useEffect(() => { loadData() }, [loadData])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await axios.post('/api/admin/business-workflow/seed', {}, { headers: authHeaders() })
      toast({ title: 'Catalog seeded successfully' })
      await loadData()
    } catch {
      toast({ title: 'Seed failed', variant: 'destructive' })
    } finally {
      setSeeding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await axios.delete(`/api/admin/services/${deleteId}`, { headers: authHeaders() })
      toast({ title: 'Service deactivated' })
      setDeleteId(null)
      await loadData()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const standaloneCount = services.filter((s) => s.packages.length === 0).length
  const sortedServices = [...services].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <AdminPageTemplate
      title="Services Catalog"
      description="Manage business services — add standalone or assign to packages"
      icon={<Briefcase className="h-5 w-5 text-emerald-600" />}
      showConstruction={false}
      requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Seed Catalog
          </Button>
          <Button size="sm" onClick={() => { setEditId(null); setModalOpen(true) }} className="bg-emerald-700 hover:bg-emerald-800">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No services yet.</p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Service</Button>
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>Seed Defaults</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{services.length} services</Badge>
            <Badge variant="outline">{standaloneCount} standalone</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Packages</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedServices.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="text-muted-foreground">{svc.sortOrder}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {svc.name}
                          {!svc.isActive && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{svc.category.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {svc.packages.length === 0 ? (
                            <Badge variant="outline">Standalone</Badge>
                          ) : (
                            svc.packages.map((p) => (
                              <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground max-w-xs truncate">
                        {svc.description ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => { setEditId(svc.id); setModalOpen(true) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(svc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <ServiceFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        serviceId={editId}
        onSuccess={loadData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this service?</AlertDialogTitle>
            <AlertDialogDescription>
              The service will be hidden from the catalog but existing package links are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removing...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageTemplate>
  )
}
