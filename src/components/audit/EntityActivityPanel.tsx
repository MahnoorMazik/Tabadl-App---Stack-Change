'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, History } from 'lucide-react'
import { format } from 'date-fns'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'

interface AuditLogRow {
  id: string
  action: string
  entityName: string | null
  changes: string | null
  createdAt: string
  user: { name: string | null; email: string }
}

interface EntityActivityPanelProps {
  entityType: string
  entityId: string
  title?: string
}

export function EntityActivityPanel({ entityType, entityId, title = 'Activity' }: EntityActivityPanelProps) {
  const { token } = useAuth()
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entityId) return
    const fetchLogs = async () => {
      setLoading(true)
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await axios.get('/api/audit-logs/entity', {
          params: { entityType, entityId, limit: 20 },
          headers,
        })
        setLogs(res.data?.logs ?? [])
      } catch {
        setLogs([])
      } finally {
        setLoading(false)
      }
    }
    void fetchLogs()
  }, [entityType, entityId, token])

  const actionVariant = (action: string) => {
    if (action === 'DELETE') return 'destructive' as const
    if (action === 'UPDATE') return 'secondary' as const
    return 'default' as const
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                    <span className="font-medium">{log.entityName ?? entityType}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  by {log.user.name ?? log.user.email}
                </p>
                {log.changes && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-primary">View changes</summary>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(JSON.parse(log.changes), null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
