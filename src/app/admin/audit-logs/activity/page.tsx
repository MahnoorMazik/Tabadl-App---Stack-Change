'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Globe, Monitor } from 'lucide-react'
import { format } from 'date-fns'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { Module, Action } from '@/lib/rbac'
import { getLocalizedText } from '@/lib/multilingual-text'

interface PageAccessLogRow {
  id: string
  path: string
  pageTitle: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

export default function UserActivityPage() {
  const { token } = useAuth()
  const [logs, setLogs] = useState<PageAccessLogRow[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [userId, setUserId] = useState('all')
  const [pathFilter, setPathFilter] = useState('')
  const [loading, setLoading] = useState(true)
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

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (userId !== 'all') params.set('userId', userId)
      if (pathFilter.trim()) params.set('path', pathFilter.trim())
      const res = await axios.get(`/api/audit-logs/page-access?${params}`, { headers })
      setLogs(res.data?.logs ?? [])
      setTotalPages(res.data?.pagination?.pages ?? 1)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [userId, pathFilter, page, token])

  useEffect(() => {
    void fetchLogs(1)
    setPage(1)
  }, [userId])

  return (
    <AdminPageTemplate
      title="User Activity"
      description="Full audit trail of which user accessed which admin page and when"
      requiredPermission={`${Module.AUDIT}.${Action.VIEW}`}
      icon={<Monitor className="h-6 w-6" />}
      showConstruction={false}
      actions={
        <Button variant="outline" asChild>
          <Link href="/admin/audit-logs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Audit Logs
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
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger><SelectValue placeholder="All users" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Path contains</Label>
              <div className="flex gap-2">
                <Input
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  placeholder="/admin/leads"
                />
                <Button onClick={() => { setPage(1); void fetchLogs(1) }}>Apply</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-muted-foreground">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No activity found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-sm">{getLocalizedText(log.user.name, 'en') || log.user.email}</TableCell>
                    <TableCell className="text-sm">{log.pageTitle ?? '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{log.path}</TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {log.ipAddress ?? '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); void fetchLogs(p) }}>Previous</Button>
          <span className="self-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); void fetchLogs(p) }}>Next</Button>
        </div>
      )}
    </AdminPageTemplate>
  )
}
