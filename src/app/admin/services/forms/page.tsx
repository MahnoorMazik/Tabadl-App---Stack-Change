'use client'

import { useState } from 'react'
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
import { ClipboardList, Plus } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import {
  MOCK_FORM_TEMPLATES,
  MOCK_BUSINESS_SERVICES,
  FormTemplate,
} from '@/components/admin/forms/types'

export default function FormTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<FormTemplate[]>(MOCK_FORM_TEMPLATES)

  const serviceName = (id: string) =>
    MOCK_BUSINESS_SERVICES.find((s) => s.id === id)?.name ?? id

  const toggleActive = (id: string, isActive: boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive } : t))
    )
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
            {templates.length} template{templates.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      Updated {template.updatedAt}
                    </p>
                  </TableCell>
                  <TableCell>
                    {template.serviceIds.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {template.serviceIds.map((id) => (
                          <Badge key={id} variant="secondary" className="font-normal">
                            {serviceName(id)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {template.fields.length}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={(checked) => toggleActive(template.id, checked)}
                      aria-label={`Toggle ${template.name} active`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageTemplate>
  )
}
