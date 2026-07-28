'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Layers, Plus, Eye, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { useToast } from '@/hooks/use-toast'
import { CreateWizardModal } from '@/components/admin/wizards/CreateWizardModal'
import { WizardPreviewModal } from '@/components/admin/wizards/WizardPreviewModal'
import { wizardApi, WizardApiError } from '@/components/admin/wizards/api'
import { WizardListItem, mapApiWizard } from '@/components/admin/wizards/types'
import { Switch } from '@/components/ui/switch'
import { formApi } from '@/components/admin/forms/api'

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
}

export default function WizardsPage() {
  const { toast } = useToast()
  const [wizards, setWizards] = useState<WizardListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWizard, setEditingWizard] = useState<WizardListItem | null>(null)
  const [previewWizard, setPreviewWizard] = useState<WizardListItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WizardListItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [formAreaById, setFormAreaById] = useState<Record<string, string>>({})

  const loadWizards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await wizardApi.list()
      setWizards((res.wizards ?? []).map(mapApiWizard))
      const formsRes = await formApi.listTemplates()
      const index: Record<string, string> = {}
      for (const form of formsRes.templates ?? []) {
        index[form.id] = form.areaOfInterest ?? ''
      }
      setFormAreaById(index)
    } catch (error) {
      toast({
        title: 'Failed to load wizards',
        description:
          error instanceof WizardApiError
            ? error.message
            : 'Please refresh and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadWizards()
  }, [loadWizards])

  const openCreate = () => {
    setEditingWizard(null)
    setModalOpen(true)
  }

  const openEdit = (wizard: WizardListItem) => {
    setEditingWizard(wizard)
    setModalOpen(true)
  }

  const openPreview = (wizard: WizardListItem) => {
    setPreviewWizard(wizard)
    setPreviewOpen(true)
  }

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open)
    if (!open) setEditingWizard(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await wizardApi.delete(deleteTarget.id)
      setWizards((prev) => prev.filter((w) => w.id !== deleteTarget.id))
      toast({
        title: 'Wizard deleted',
        description: `${deleteTarget.name} removed.`,
      })
      setDeleteTarget(null)
    } catch (error) {
      toast({
        title: 'Delete failed',
        description:
          error instanceof WizardApiError
            ? error.message
            : 'Could not delete wizard.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const toggleActive = async (wizard: WizardListItem, isActive: boolean) => {
    setTogglingId(wizard.id)
    try {
      const res = await wizardApi.update(wizard.id, { isActive })
      const updated = mapApiWizard(res.wizard)
      setWizards((prev) => prev.map((w) => (w.id === wizard.id ? updated : w)))
    } catch (error) {
      toast({
        title: 'Update failed',
        description:
          error instanceof WizardApiError ? error.message : 'Could not update wizard status.',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const coverBadgeClass = (aoi: string) => {
    if (aoi === 'CR') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (aoi === 'PR') return 'bg-violet-50 text-violet-700 border-violet-200'
    if (aoi === 'GR') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    return ''
  }

  return (
    <AdminPageTemplate
      title="Wizards"
      description="Configure application step flows by area of interest and services"
      icon={<Layers className="h-5 w-5 text-emerald-600" />}
      showConstruction={false}
      requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      actions={
        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Applications Steps
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total wizards</CardDescription>
            <CardTitle className="text-2xl">{wizards.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">
              {wizards.filter((w) => (w as any).isActive ?? true).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Application wizards</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : wizards.length === 0
                ? 'No wizards yet'
                : `${wizards.length} wizard${wizards.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : wizards.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Create your first application steps wizard.
              </p>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={openCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Applications Steps
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Covers</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Auto-matched</TableHead>
                  <TableHead className="w-24">Active</TableHead>
                  <TableHead className="w-24">Created</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wizards.map((wizard) => (
                  <TableRow key={wizard.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium max-w-48">
                      <span className="truncate block">{wizard.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(
                          new Set(
                            wizard.steps
                              .map((s) => formAreaById[s.formTemplateId] || wizard.areaOfInterest)
                              .filter(Boolean)
                          )
                        ).map((aoi) => (
                          <Badge key={aoi} variant="outline" className={coverBadgeClass(aoi)}>
                            {aoi}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{wizard.steps.length} step{wizard.steps.length === 1 ? '' : 's'}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="text-sm text-muted-foreground">0 auto-matched</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={(wizard as any).isActive ?? true}
                        disabled={togglingId === wizard.id}
                        onCheckedChange={(checked) => void toggleActive(wizard, checked)}
                        aria-label={`Toggle ${wizard.name} active`}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(wizard.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border"
                          onClick={() => openPreview(wizard)}
                          aria-label="Preview wizard"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border"
                          onClick={() => openEdit(wizard)}
                          aria-label="Edit wizard"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(wizard)}
                          aria-label="Delete wizard"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateWizardModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        editingWizard={editingWizard}
        onCreated={(wizard) => setWizards((prev) => [wizard, ...prev])}
        onUpdated={(wizard) =>
          setWizards((prev) => prev.map((w) => (w.id === wizard.id ? wizard : w)))
        }
      />

      <WizardPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        wizard={previewWizard}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium">{deleteTarget?.name}</span>
              {deleteTarget
                ? ` (${deleteTarget.areaOfInterest}, ${deleteTarget.steps.length} step${deleteTarget.steps.length === 1 ? '' : 's'})`
                : ''}
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageTemplate>
  )
}
