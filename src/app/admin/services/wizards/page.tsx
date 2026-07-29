'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Layers,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { useToast } from '@/hooks/use-toast'
import { CreateWizardModal } from '@/components/admin/wizards/CreateWizardModal'
import { WizardPreviewModal } from '@/components/admin/wizards/WizardPreviewModal'
import { wizardApi, WizardApiError } from '@/components/admin/wizards/api'
import { WizardListItem, mapApiWizard } from '@/components/admin/wizards/types'
import { formApi } from '@/components/admin/forms/api'

const PAGE_SIZE = 10

const AOI_LABELS: Record<string, string> = {
  CR: 'Company Registration',
  PR: 'Premium Residency',
  GR: 'General Services',
}

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

  // Search & pagination state
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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

  // Reset page to 1 whenever search changes
  useEffect(() => {
    setPage(1)
  }, [search])

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

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return wizards
    return wizards.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.areaOfInterest?.toLowerCase().includes(q)
    )
  }, [wizards, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
          className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Wizard
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Application wizards</CardTitle>
              <CardDescription className="mt-0.5">
                {loading
                  ? 'Loading…'
                  : filtered.length === 0
                    ? search ? 'No results found' : 'No wizards yet'
                    : `${filtered.length} wizard${filtered.length === 1 ? '' : 's'}${search ? ' found' : ''}`}
              </CardDescription>
            </div>
            {/* Search */}
            <div className="relative sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search wizards…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
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
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No wizards match your search.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead className="w-24">Created</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((wizard) => (
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
                            <span key={aoi} className="text-sm">
                              {AOI_LABELS[aoi] ?? aoi}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {wizard.steps.length} step{wizard.steps.length === 1 ? '' : 's'}
                        </span>
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

              {/* Pagination — only show when more than PAGE_SIZE records */}
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t pt-4 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {safePage} of {totalPages} &mdash; {filtered.length} record{filtered.length === 1 ? '' : 's'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={p === safePage ? 'default' : 'outline'}
                        size="icon"
                        className={`h-8 w-8 text-xs ${p === safePage ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-700' : ''}`}
                        onClick={() => setPage(p)}
                        aria-label={`Page ${p}`}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateWizardModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        editingWizard={editingWizard}
        onCreated={() => {
          setPage(1)
          void loadWizards()
        }}
        onUpdated={() => {
          void loadWizards()
        }}
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
