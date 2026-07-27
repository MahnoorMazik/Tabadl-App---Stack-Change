'use client'

import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { FormBuilder } from '@/components/admin/forms/FormBuilder'
import { Button } from '@/components/ui/button'
import { ClipboardList, ArrowLeft } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import Link from 'next/link'

export default function NewFormPage() {
  return (
    <AdminPageTemplate
      title="New Form"
      description="Create a form template and assign it to services"
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
      <FormBuilder mode="create" />
    </AdminPageTemplate>
  )
}
