'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { FormBuilder } from '@/components/admin/forms/FormBuilder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, ArrowLeft } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { getMockFormTemplate } from '@/components/admin/forms/types'

export default function EditFormPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''

  const template = useMemo(() => {
    const found = getMockFormTemplate(id)
    if (found) {
      // Clone so edits don't mutate shared mock data
      return {
        ...found,
        serviceIds: [...found.serviceIds],
        fields: found.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
      }
    }
    return null
  }, [id])

  if (!template) {
    return (
      <AdminPageTemplate
        title="Form not found"
        description="This form template does not exist in the mock data"
        icon={<ClipboardList className="h-5 w-5 text-emerald-600" />}
        showConstruction={false}
        requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
        actions={
          <Link href="/admin/services/forms">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to forms
            </Button>
          </Link>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Unknown form</CardTitle>
            <CardDescription>
              No mock template with id <code className="text-xs">{id}</code> was found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/services/forms/new">
              <Button className="bg-emerald-700 hover:bg-emerald-800">Create a new form</Button>
            </Link>
          </CardContent>
        </Card>
      </AdminPageTemplate>
    )
  }

  return (
    <AdminPageTemplate
      title={template.name || 'Edit Form'}
      description="Update fields, services, and preview the client form"
      icon={<ClipboardList className="h-5 w-5 text-emerald-600" />}
      showConstruction={false}
      fullWidth
      requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      actions={
        <Link href="/admin/services/forms">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to forms
          </Button>
        </Link>
      }
    >
      <FormBuilder mode="edit" initialTemplate={template} />
    </AdminPageTemplate>
  )
}
