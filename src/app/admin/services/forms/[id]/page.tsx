'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { FormBuilder } from '@/components/admin/forms/FormBuilder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, ArrowLeft, Loader2 } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import {
  FormTemplateDetail,
  mapApiTemplateDetail,
} from '@/components/admin/forms/types'
import { formApi, FormApiError } from '@/components/admin/forms/api'

export default function EditFormPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''

  // Guard: if dynamic [id] ever catches the static "new" segment, send to create page
  useEffect(() => {
    if (id === 'new') {
      router.replace('/admin/services/forms/new')
    }
  }, [id, router])

  const [template, setTemplate] = useState<FormTemplateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || id === 'new') {
      if (!id) setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setNotFound(false)
      setError(null)
      try {
        const res = await formApi.getTemplate(id)
        if (cancelled) return
        setTemplate(mapApiTemplateDetail(res.template))
      } catch (err) {
        if (cancelled) return
        if (err instanceof FormApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(err instanceof FormApiError ? err.message : 'Failed to load form')
        }
        setTemplate(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (id === 'new') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <AdminPageTemplate
        title="Edit Form"
        description="Loading form template…"
        icon={<ClipboardList className="h-5 w-5 text-emerald-600" />}
        showConstruction={false}
        fullWidth
        requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      >
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </AdminPageTemplate>
    )
  }

  if (notFound || error) {
    return (
      <AdminPageTemplate
        title={notFound ? 'Form not found' : 'Unable to load form'}
        description={
          notFound
            ? 'This form template does not exist or was deleted'
            : 'Something went wrong while loading the template'
        }
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
            <CardTitle>{notFound ? 'Unknown form' : 'Load error'}</CardTitle>
            <CardDescription>
              {notFound ? (
                <>
                  No template with id <code className="text-xs">{id}</code> was found.
                </>
              ) : (
                error
              )}
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
      title={template?.name || 'Edit Form'}
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
      {template && <FormBuilder mode="edit" initialTemplate={template} />}
    </AdminPageTemplate>
  )
}
