'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { ApplicationStepForm } from '@/components/client/ApplicationStepForm'

interface AdminClientApplication {
  id: string
  client?: { name?: string; user?: { name?: string } }
  createdAt: string
  updatedAt: string
  status?: string
  notes?: string | null
}

export default function AdminClientApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AdminClientApplication[]>([])
  const [selected, setSelected] = useState<AdminClientApplication | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [continueOpen, setContinueOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/client-applications', { credentials: 'include' })
        const json = await res.json()
        const apps = json?.data?.applications ?? json?.applications ?? []
        setRows(apps)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const progress = useMemo(() => {
    return rows.map((row) => ({
      id: row.id,
      label: row.status === 'APPROVED' ? '3 of 3 steps' : row.status === 'REJECTED' ? '1 of 3 steps' : '2 of 3 steps',
    }))
  }, [rows])

  return (
    <AdminPageTemplate
      title="Signups & Interests"
      description="Client applications with interests and progress"
      requiredPermission={`${Module.CLIENTS}.${Action.VIEW}`}
      showConstruction={false}
    >
      <Card>
        <CardHeader>
          <CardTitle>Client applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Interests</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => {
                      setSelected(row)
                      setDetailOpen(true)
                    }}
                  >
                    <TableCell>{row.client?.name || row.client?.user?.name || 'Unknown client'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">CR</Badge>
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">PR</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{progress.find((p) => p.id === row.id)?.label || '0 of 0 steps'}</TableCell>
                    <TableCell>{new Date(row.updatedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Application details</DialogTitle>
            <DialogDescription>Step answers and current progress</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">Step 1 — Profile Form</p>
                <p className="text-sm text-muted-foreground italic mt-1">Not answered yet</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">Step 2 — Service Details</p>
                <p className="text-sm text-muted-foreground italic mt-1">Not answered yet</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setContinueOpen(true)}>Continue this application as Admin</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={continueOpen} onOpenChange={setContinueOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Continue application as Admin</DialogTitle>
          </DialogHeader>
          <ApplicationStepForm
            stepId={selected?.id || 'temp'}
            stepNumber={1}
            totalSteps={3}
            stepIndex={0}
            formName="Client Application Step"
            fields={[
              { id: 'fullName', fieldId: 'fullName', label: 'Full name', type: 'TEXT', required: true },
              { id: 'notes', fieldId: 'notes', label: 'Notes', type: 'TEXTAREA', required: false },
            ]}
            isAdminActingOnBehalf
            onSaveExit={() => setContinueOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </AdminPageTemplate>
  )
}

