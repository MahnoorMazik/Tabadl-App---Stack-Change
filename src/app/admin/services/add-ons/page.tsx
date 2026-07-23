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
import { AddOnFormModal } from '@/components/services/AddOnFormModal'
import { PlusCircle, Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { useToast } from '@/hooks/use-toast'

interface AddOn {
  id: string
  name: string
  description: string | null
  priceSar: number
  priceUsd: number
  isActive: boolean
  service?: { id: string; name: string } | null
}

export default function AdditionalServicesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [addOns, setAddOns] = useState<AddOn[]>([])
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
      const res = await axios.get('/api/admin/additional-services', { headers: authHeaders() })
      setAddOns(res.data.addOns ?? [])
    } catch {
      toast({ title: 'Failed to load add-ons', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await axios.delete(`/api/admin/additional-services/${deleteId}`, { headers: authHeaders() })
      toast({ title: 'Add-on deactivated' })
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
      title="Additional Services"
      description="Optional add-on services at extra cost beyond package inclusions"
      icon={<PlusCircle className="h-5 w-5 text-emerald-600" />}
      showConstruction={false}
      requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      actions={
        <Button size="sm" onClick={() => { setEditId(null); setModalOpen(true) }} className="bg-emerald-700 hover:bg-emerald-800">
          <Plus className="h-4 w-4 mr-2" />
          Add Add-on
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add-on Services</CardTitle>
            <CardDescription>{addOns.length} additional services</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead className="text-right">SAR</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addOns.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.name}
                      {!a.isActive && <Badge variant="secondary" className="ml-2">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{a.description}</TableCell>
                    <TableCell>{a.service?.name ?? 'Standalone'}</TableCell>
                    <TableCell className="text-right">{a.priceSar.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{a.priceUsd.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => { setEditId(a.id); setModalOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {addOns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No add-ons yet. <Button variant="link" onClick={() => setModalOpen(true)}>Create one</Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddOnFormModal open={modalOpen} onOpenChange={setModalOpen} addOnId={editId} onSuccess={loadData} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this add-on?</AlertDialogTitle>
            <AlertDialogDescription>It will no longer appear in the catalog.</AlertDialogDescription>
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
