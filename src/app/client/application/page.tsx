'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { AREA_OF_INTEREST_OPTIONS } from '@/components/admin/forms/types'

interface ClientApplicationLite {
  id: string
  applicationNumber?: string
  status?: string
  createdAt: string
  updatedAt: string
}

export default function ClientSingleApplicationPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ClientApplicationLite[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [lastAdded, setLastAdded] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client-applications', { credentials: 'include' })
      const json = await res.json()
      const apps = json?.data?.applications ?? json?.applications ?? []
      setItems(apps)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void load()
  }, [user])

  const knownInterests = useMemo(() => new Set<string>(), [])

  const addInterests = async () => {
    if (selected.length === 0) return
    setSubmitting(true)
    try {
      const appended: string[] = []
      for (const interest of selected) {
        await fetch('/api/client/application/interests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ areaOfInterest: interest }),
        })
        appended.push(interest)
      }
      setLastAdded(appended)
      setSelected([])
      await load()
    } catch {
      // endpoint may be unavailable in current backend
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((app, idx) => (
            <div key={app.id} className="rounded-md border p-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium">{app.applicationNumber || `Application ${idx + 1}`}</p>
                <p className="text-xs text-muted-foreground">Updated {new Date(app.updatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{app.status || 'PENDING'}</Badge>
                {lastAdded.length > 0 && idx >= Math.max(0, items.length - lastAdded.length) && (
                  <Badge variant="secondary">Just added</Badge>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <Alert>
              <AlertDescription>No application steps found yet.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>+ Add another interest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Already selected interests stay locked. New steps append at the end.
          </p>
          {AREA_OF_INTEREST_OPTIONS.map((option) => {
            const disabled = knownInterests.has(option.key)
            const checked = selected.includes(option.key)
            return (
              <div key={option.key} className={`rounded-md border px-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`client-interest-${option.key}`}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(value) => {
                      setSelected((prev) =>
                        value === true
                          ? [...prev, option.key]
                          : prev.filter((v) => v !== option.key)
                      )
                    }}
                  />
                  <div className="min-w-0">
                    <Label htmlFor={`client-interest-${option.key}`} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="flex justify-end">
            <Button onClick={addInterests} disabled={submitting || selected.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add interest
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

