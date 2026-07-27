'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { ClipboardList, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { FormTemplateListItem } from '@/components/admin/forms/types'
import { formApi, FormApiError } from '@/components/admin/forms/api'
import { useToast } from '@/hooks/use-toast'

function formatUpdatedAt(value: string) {
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
}

export default function FormTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<FormTemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FormTemplateListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await formApi.listTemplates()
      setTemplates(
        (res.templates ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          areaOfInterest: t.areaOfInterest ?? null,
          isActive: t.isActive,
          fieldCount: t.fieldCount ?? 0,
          updatedAt: t.updatedAt,
          createdAt: t.createdAt,
          services: t.services ?? [],
        }))
      )
    } catch {
      // Silently show empty state — no toast needed when no templates exist yet
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const toggleActive = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    const previous = templates
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive } : t))
    )

    try {
      await formApi.updateTemplate(id, { isActive })
    } catch (error) {
      setTemplates(previous)
      const message =
        error instanceof FormApiError ? error.message : 'Failed to update form status'
      toast({ title: 'Update failed', description: message, variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await formApi.deleteTemplate(deleteTarget.id)
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      toast({
        title: 'Form deleted',
        description: `${deleteTarget.name} removed.`,
      })
      setDeleteTarget(null)
    } catch (error) {
      toast({
        title: 'Delete failed',
        description:
          error instanceof FormApiError
            ? error.message
            : 'Could not delete form.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminPageTemplate
      title="Form Templates"
      description="Build and assign intake forms to business services"
      icon={<ClipboardList className="h-5 w-5 text-emerald-600" />}
      showConstruction={false}
      requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      actions={
        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800"
          onClick={() => router.push('/admin/services/forms/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Form
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Forms</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : `${templates.length} template${templates.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground mb-0">
                No form templates yet. Create your first intake form.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form name</TableHead>
                  <TableHead className="w-24">Interest</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="text-center w-28">Fields</TableHead>
                  <TableHead className="w-28">Active</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">
                        Updated {formatUpdatedAt(template.updatedAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {template.areaOfInterest ? (
                        <Badge variant="secondary">{template.areaOfInterest}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.services.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {template.services.slice(0, 3).map((svc) => (
                            <Badge key={svc.id} variant="secondary" className="font-normal">
                              {svc.name}
                            </Badge>
                          ))}
                          {template.services.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{template.services.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {template.fieldCount}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={template.isActive}
                        disabled={togglingId === template.id}
                        onCheckedChange={(checked) => void toggleActive(template.id, checked)}
                        aria-label={`Toggle ${template.name} active`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            router.push(`/admin/services/forms/${template.id}`)
                          }
                          aria-label={`Edit ${template.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(template)}
                          aria-label={`Delete ${template.name}`}
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

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{' '}
              <span className="font-medium">{deleteTarget?.name}</span>
              {deleteTarget
                ? ` (${deleteTarget.fieldCount} field${deleteTarget.fieldCount === 1 ? '' : 's'})`
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
