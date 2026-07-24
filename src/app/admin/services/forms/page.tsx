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
import { ClipboardList, Plus, Loader2 } from 'lucide-react'
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

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await formApi.listTemplates()
      setTemplates(
        (res.templates ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          isActive: t.isActive,
          fieldCount: t.fieldCount ?? 0,
          updatedAt: t.updatedAt,
          createdAt: t.createdAt,
          services: t.services ?? [],
        }))
      )
    } catch (error) {
      const message =
        error instanceof FormApiError ? error.message : 'Failed to load form templates'
      toast({ title: 'Load failed', description: message, variant: 'destructive' })
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [toast])

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
              <p className="text-sm text-muted-foreground mb-4">
                No form templates yet. Create your first intake form.
              </p>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={() => router.push('/admin/services/forms/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Form
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form name</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="text-center w-28">Fields</TableHead>
                  <TableHead className="w-28">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/services/forms/${template.id}`)}
                  >
                    <TableCell className="font-medium">
                      {template.name}
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">
                        Updated {formatUpdatedAt(template.updatedAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {template.services.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {template.services.map((svc) => (
                            <Badge key={svc.id} variant="secondary" className="font-normal">
                              {svc.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {template.fieldCount}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={template.isActive}
                        disabled={togglingId === template.id}
                        onCheckedChange={(checked) => void toggleActive(template.id, checked)}
                        aria-label={`Toggle ${template.name} active`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminPageTemplate>
  )
}
