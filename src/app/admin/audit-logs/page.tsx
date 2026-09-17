'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, History, Activity } from 'lucide-react'
import { format } from 'date-fns'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { Module, Action } from '@/lib/rbac'
import { getLocalizedText } from '@/lib/multilingual-text'

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  entityName: string | null
  action: string
  changes: string | null
  createdAt: string
  user: { name: string | null; email: string }
}

const ENTITY_TYPES = ['User', 'Client', 'Lead', 'Application', 'Task', 'Document', 'Auth']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']

export default function AuditLogsPage() {
  const { token } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [userId, setUserId] = useState('all')
  const [entity, setEntity] = useState('all')
  const [action, setAction] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    axios.get('/api/users', { headers })
      .then((res) => {
        const list = res.data?.data?.users ?? res.data?.users ?? []
        setUsers(list.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
      })
      .catch(() => setUsers([]))
  }, [token])

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const params = new URLSearchParams({ page: String(page), limit: '50' })
        if (userId !== 'all') params.set('userId', userId)
        if (entity !== 'all') params.set('entity', entity)
        if (action !== 'all') params.set('action', action)
        const res = await axios.get(`/api/audit-logs?${params}`, { headers })
        setLogs(res.data?.logs ?? [])
        setTotalPages(res.data?.pagination?.pages ?? 1)
      } catch {
        setLogs([])
      } finally {
        setLoading(false)
      }
    }
    void fetchLogs()
  }, [userId, entity, action, page, token])

  const getActionBadge = (actionName: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      CREATE: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive',
      LOGIN: 'outline',
      LOGOUT: 'outline',
    }
    return variants[actionName] || 'default'
  }

  return (
    <AdminPageTemplate
      title="Audit Logs"
      description="Track create, update, and delete actions across the system"
      requiredPermission={`${Module.AUDIT}.${Action.VIEW}`}
      icon={<History className="h-6 w-6" />}
      showConstruction={false}
      actions={
        <Button variant="outline" asChild>
          <Link href="/admin/audit-logs/activity">
            <Activity className="h-4 w-4 mr-2" />
            User Activity
          </Link>
        </Button>
      }
    >
      <Card className="mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={userId} onValueChange={(v) => { setUserId(v); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="All users" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="All entities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {ENTITY_TYPES.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-muted-foreground">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No audit logs found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                      <TableCell>
                        {log.changes ? (expandedRow === log.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">{getLocalizedText(log.user.name, 'en') || log.user.email}</TableCell>
                      <TableCell><Badge variant={getActionBadge(log.action)}>{log.action}</Badge></TableCell>
                      <TableCell className="text-sm">{log.entityType}</TableCell>
                      <TableCell className="text-sm">{getLocalizedText(log.entityName, 'en') || log.entityId}</TableCell>
                    </TableRow>
                    {expandedRow === log.id && log.changes && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                            {JSON.stringify(JSON.parse(log.changes), null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="self-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </AdminPageTemplate>
  )
}
