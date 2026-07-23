'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PackageFormModal } from '@/components/services/PackageFormModal'
import { Package, Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { useToast } from '@/hooks/use-toast'

interface PackageData {
  id: string
  name: string
  description: string | null
  basePriceSar: number
  basePriceUsd: number
  isFeatured: boolean
  isActive: boolean
  services: Array<{ id: string; name: string; sortOrder: number }>
  paymentSchedule: Array<{ phaseNumber: number; amountSar: number }>
}

export default function ServicePackagesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<PackageData[]>([])
  const [phases, setPhases] = useState<Array<{ phaseNumber: number; name: string; percentage: number }>>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pkgRes, catalogRes] = await Promise.all([
        axios.get('/api/admin/service-packages', { headers: authHeaders() }),
        axios.get('/api/services/catalog'),
      ])
      setPackages(pkgRes.data.packages ?? [])
      setPhases(catalogRes.data.paymentPhases ?? [])
    } catch {
      toast({ title: 'Failed to load packages', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await axios.delete(`/api/admin/service-packages/${deleteId}`, { headers: authHeaders() })
      toast({ title: 'Package deactivated' })
      setDeleteId(null)
      await loadData()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminPageTemplate
      title="Service Packages"
      description="Create and manage packages with included services and pricing"
      icon={<Package className="h-5 w-5 text-emerald-600" />}
      showConstruction={false}
      requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      actions={
        <Button size="sm" onClick={() => { setEditId(null); setModalOpen(true) }} className="bg-emerald-700 hover:bg-emerald-800">
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Payment Structure</CardTitle>
              <CardDescription>Same 4-phase split for all packages (30% / 30% / 25% / 15%)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phase</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phases.map((p) => (
                    <TableRow key={p.phaseNumber}>
                      <TableCell>{p.phaseNumber}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">{p.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className={pkg.isFeatured ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{pkg.name}</CardTitle>
                      {!pkg.isActive && <Badge variant="secondary" className="mt-1">Inactive</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditId(pkg.id); setModalOpen(true) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(pkg.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold">{pkg.basePriceSar.toLocaleString()} SAR</p>
                    <p className="text-sm text-muted-foreground">USD {pkg.basePriceUsd.toLocaleString()}</p>
                    {pkg.isFeatured && <Badge className="mt-2 bg-emerald-600">Popular</Badge>}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">{pkg.services.length} included services</p>
                    <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                      {pkg.services.map((s) => (
                        <li key={s.id}>{s.sortOrder}. {s.name}</li>
                      ))}
                    </ul>
                  </div>
                  {pkg.paymentSchedule?.length > 0 && (
                    <div className="space-y-1">
                      {pkg.paymentSchedule.map((ph) => (
                        <div key={ph.phaseNumber} className="flex justify-between text-xs">
                          <span>Phase {ph.phaseNumber}</span>
                          <span>{ph.amountSar.toLocaleString()} SAR</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {packages.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No packages yet.</p>
                <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Package</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <PackageFormModal open={modalOpen} onOpenChange={setModalOpen} packageId={editId} onSuccess={loadData} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this package?</AlertDialogTitle>
            <AlertDialogDescription>
              The package will be hidden from clients but service assignments are preserved.
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
