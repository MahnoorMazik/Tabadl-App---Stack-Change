'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { ArrowLeft, Loader2, TableIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'

const PAGE_SIZE = 50

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function DatabaseTableDataPage() {
  const params = useParams()
  const tableName = typeof params.tableName === 'string' ? decodeURIComponent(params.tableName) : ''
  const { token } = useAuth()

  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const headers = () => {
    const authToken = token || localStorage.getItem('auth-token')
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  useEffect(() => {
    if (!tableName) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await axios.get(
          `/api/admin/settings/database/tables/${encodeURIComponent(tableName)}`,
          { params: { page, pageSize: PAGE_SIZE }, headers: headers() }
        )
        if (cancelled) return
        if (response.data.success) {
          setColumns(response.data.columns)
          setRows(response.data.rows)
          setTotalRows(response.data.totalRows)
        } else {
          setError(response.data.error || 'Failed to load table data.')
        }
      } catch (err: any) {
        if (cancelled) return
        setError(err.response?.data?.error || 'Failed to load table data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [tableName, page, token])

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  return (
    <AdminPageTemplate
      title={tableName || 'Table'}
      description="Browse the rows currently stored in this table on the active database."
      icon={<TableIcon className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <Link href="/admin/settings/database">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Database Settings
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              {tableName}
            </CardTitle>
            <CardDescription>
              {loading ? 'Loading…' : `${totalRows} row${totalRows === 1 ? '' : 's'} total`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">This table has no rows yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell key={col} className="max-w-xs truncate font-mono text-xs" title={formatCell(row[col])}>
                              {formatCell(row[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
