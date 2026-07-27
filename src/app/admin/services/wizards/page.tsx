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

  const loadWizards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await wizardApi.list()
      setWizards((res.wizards ?? []).map(mapApiWizard))
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
      <Card>
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
                  <TableHead>Interest</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead className="w-32">Created</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wizards.map((wizard) => (
                  <TableRow key={wizard.id}>
                    <TableCell className="font-medium max-w-[12rem]">
                      <span className="truncate block">{wizard.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{wizard.areaOfInterest}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wizard.serviceNames.slice(0, 3).map((name) => (
                          <Badge key={name} variant="outline" className="font-normal">
                            {name}
                          </Badge>
                        ))}
                        {wizard.serviceNames.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{wizard.serviceNames.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {wizard.steps.map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-muted-foreground w-12 shrink-0">
                              Step {index + 1}
                            </span>
                            <span className="truncate">{step.formName}</span>
                            {step.paymentRequired && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                Payment
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(wizard.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openPreview(wizard)}
                          aria-label="Preview wizard"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(wizard)}
                          aria-label="Edit wizard"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
