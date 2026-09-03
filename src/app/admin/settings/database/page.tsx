'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import {
  Database,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Server,
  Eye,
  EyeOff,
  Link as LinkIcon,
  TableIcon,
} from 'lucide-react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

type Provider = 'neon' | 'supabase' | 'local' | 'sqlite' | 'custom'
type ProviderStatus = { provider: Provider; configured: boolean; supported: boolean }
type CustomConfigSummary = { engine: 'postgresql' | 'sqlite'; label: string; updatedAt: string } | null

const labels: Record<Provider, string> = {
  neon: 'Neon PostgreSQL',
  supabase: 'Supabase MySQL',
  local: 'Local PostgreSQL (Docker)',
  sqlite: 'SQLite',
  custom: 'Custom Database',
}

type DbType = 'sqlite' | 'postgresql'
type ConnectionMethod = 'variables' | 'url'
type SslMode = 'disable' | 'require'

interface SqliteFormState {
  path: string
}

interface PostgresFormState {
  host: string
  port: string
  database: string
  username: string
  password: string
  sslMode: SslMode
  connectionUrl: string
}

interface FormErrors {
  [key: string]: string | undefined
}

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\/[^\s:]+:[^\s@]*@[^\s:/]+:\d+\/[^\s?]+/i

function providerToDbType(provider: Provider, customEngine?: 'postgresql' | 'sqlite' | null): DbType {
  if (provider === 'custom') return customEngine === 'sqlite' ? 'sqlite' : 'postgresql'
  return provider === 'sqlite' ? 'sqlite' : 'postgresql'
}

interface DatabaseConfigurationSectionProps {
  activeProvider: Provider | null
  activeProviderLoading: boolean
  customConfigSummary: CustomConfigSummary
  onDatabaseSwitched: (activeProvider: Provider, customConfigSummary: CustomConfigSummary) => void
}

function DatabaseConfigurationSection({ activeProvider, activeProviderLoading, customConfigSummary, onDatabaseSwitched }: DatabaseConfigurationSectionProps) {
  const { token } = useAuth()
  const { toast } = useToast()

  const headers = () => {
    const authToken = token || localStorage.getItem('auth-token')
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  const [dbType, setDbType] = useState<DbType>('postgresql')
  const appliedActiveDefault = useRef(false)

  useEffect(() => {
    if (!activeProviderLoading && activeProvider && !appliedActiveDefault.current) {
      setDbType(providerToDbType(activeProvider, customConfigSummary?.engine))
      appliedActiveDefault.current = true
    }
  }, [activeProviderLoading, activeProvider, customConfigSummary])

  const isActiveDbType = Boolean(activeProvider && providerToDbType(activeProvider, customConfigSummary?.engine) === dbType)
  const activeLabel = activeProvider === 'custom' && customConfigSummary ? customConfigSummary.label : activeProvider ? labels[activeProvider] : ''
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('variables')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [sqliteForm, setSqliteForm] = useState<SqliteFormState>({
    path: './db/custom.db',
  })

  const [postgresForm, setPostgresForm] = useState<PostgresFormState>({
    host: 'localhost',
    port: '5432',
    database: 'tabadl',
    username: 'postgres',
    password: '',
    sslMode: 'disable',
    connectionUrl: '',
  })

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [lastTestSchemaFound, setLastTestSchemaFound] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [initializingSchema, setInitializingSchema] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savedSummary, setSavedSummary] = useState<string | null>(null)

  const [tables, setTables] = useState<{ name: string; rowCount: number | null }[] | null>(null)
  const [loadingTables, setLoadingTables] = useState(false)
  const [tablesError, setTablesError] = useState<string | null>(null)

  const updateSqlite = (field: keyof SqliteFormState, value: string) => {
    setSqliteForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    resetStatus()
  }

  const updatePostgres = (field: keyof PostgresFormState, value: string) => {
    setPostgresForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    resetStatus()
  }

  // Bumped by resetStatus() on every edit and every new attempt, so a response from an
  // in-flight request that's since been superseded (field edited, or another attempt started)
  // can recognize itself as stale and be ignored instead of wrongly marking new values as verified.
  const requestEpochRef = useRef(0)

  const resetStatus = () => {
    requestEpochRef.current += 1
    setTestStatus('idle')
    setTestMessage('')
    setLastTestSchemaFound(null)
  }

  // A successful test only counts for the exact values it was run against — any edit above
  // resets testStatus back to 'idle', so these stay in sync with whatever is currently typed.
  const isVerified = testStatus === 'success'
  const schemaMissing = isVerified && lastTestSchemaFound === false
  const schemaReady = isVerified && lastTestSchemaFound === true
  const busy = testStatus === 'testing' || initializingSchema || saving

  const validate = (): boolean => {
    const nextErrors: FormErrors = {}

    if (dbType === 'sqlite') {
      if (!sqliteForm.path.trim()) nextErrors.path = 'Database path is required.'
    } else {
      if (connectionMethod === 'url') {
        if (!postgresForm.connectionUrl.trim()) {
          nextErrors.connectionUrl = 'Connection URL is required.'
        } else if (!POSTGRES_URL_PATTERN.test(postgresForm.connectionUrl.trim())) {
          nextErrors.connectionUrl = 'Enter a valid PostgreSQL connection string, e.g. postgresql://user:password@host:5432/database'
        }
      } else {
        if (!postgresForm.host.trim()) nextErrors.host = 'Host is required.'
        if (!postgresForm.port.trim()) {
          nextErrors.port = 'Port is required.'
        } else if (!/^\d+$/.test(postgresForm.port.trim())) {
          nextErrors.port = 'Port must be numeric.'
        }
        if (!postgresForm.database.trim()) nextErrors.database = 'Database name is required.'
        if (!postgresForm.username.trim()) nextErrors.username = 'Username is required.'
        if (!postgresForm.password) nextErrors.password = 'Password is required.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const buildApiPayload = (): { type: 'postgresql' | 'sqlite'; config: Record<string, unknown> } => {
    if (dbType === 'sqlite') {
      return { type: 'sqlite', config: { path: sqliteForm.path.trim() } }
    }
    if (connectionMethod === 'url') {
      return { type: 'postgresql', config: { method: 'url', connectionUrl: postgresForm.connectionUrl.trim() } }
    }
    return {
      type: 'postgresql',
      config: {
        method: 'variables',
        host: postgresForm.host.trim(),
        port: postgresForm.port.trim(),
        database: postgresForm.database.trim(),
        username: postgresForm.username.trim(),
        password: postgresForm.password,
        sslMode: postgresForm.sslMode,
      },
    }
  }

  const handleTestConnection = async () => {
    resetStatus()
    if (!validate()) {
      toast({ title: 'Fix validation errors', description: 'Please correct the highlighted fields before testing the connection.', variant: 'destructive' })
      return
    }

    const epoch = requestEpochRef.current
    setTestStatus('testing')
    try {
      const response = await axios.post('/api/admin/settings/database/test', buildApiPayload(), { headers: headers() })
      if (epoch !== requestEpochRef.current) return // form changed, or another attempt started, since this request was sent
      if (response.data.success) {
        setTestStatus('success')
        setLastTestSchemaFound(Boolean(response.data.schemaFound))
        setTestMessage(
          response.data.schemaFound
            ? 'Connected successfully.'
            : 'Connected successfully, but this database is empty — it has no tables yet. Click Initialize Schema to create them and seed a default admin account.'
        )
      } else {
        setTestStatus('error')
        setTestMessage(response.data.error || 'Connection failed.')
      }
    } catch (error: any) {
      if (epoch !== requestEpochRef.current) return
      setTestStatus('error')
      setTestMessage(error.response?.data?.error || 'Connection test failed.')
    }
  }

  const handleInitializeSchema = async () => {
    resetStatus()
    if (!validate()) {
      toast({ title: 'Fix validation errors', description: 'Please correct the highlighted fields before initializing the schema.', variant: 'destructive' })
      return
    }

    const epoch = requestEpochRef.current
    setInitializingSchema(true)
    try {
      const response = await axios.post('/api/admin/settings/database/init-schema', buildApiPayload(), { headers: headers() })
      if (epoch !== requestEpochRef.current) return
      if (response.data.success) {
        setTestStatus('success')
        setLastTestSchemaFound(true)
        setTestMessage('Schema created and a default admin account was added (admin@tk.sa / admin123). You can now click Change Database to switch to this database.')
        toast({ title: 'Schema initialized', description: 'Tables created and a default admin account (admin@tk.sa / admin123) was seeded on this database.' })
      } else {
        setTestStatus('error')
        setTestMessage(response.data.error || 'Failed to initialize the schema.')
      }
    } catch (error: any) {
      if (epoch !== requestEpochRef.current) return
      setTestStatus('error')
      setTestMessage(error.response?.data?.error || 'Failed to initialize the schema.')
    } finally {
      setInitializingSchema(false)
    }
  }

  const handleViewTables = async () => {
    setLoadingTables(true)
    setTablesError(null)
    try {
      const response = await axios.get('/api/admin/settings/database/tables', { headers: headers() })
      if (response.data.success) {
        setTables(response.data.tables)
      } else {
        setTables(null)
        setTablesError(response.data.error || 'Failed to load tables.')
      }
    } catch (error: any) {
      setTables(null)
      setTablesError(error.response?.data?.error || 'Failed to load tables.')
    } finally {
      setLoadingTables(false)
    }
  }

  useEffect(() => {
    if (!activeProviderLoading) {
      void handleViewTables()
    }
  }, [activeProviderLoading])

  const handleSaveClick = () => {
    if (!validate()) {
      toast({ title: 'Fix validation errors', description: 'Please correct the highlighted fields before saving.', variant: 'destructive' })
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirmSave = async () => {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const payload = buildApiPayload()
      const response = await axios.put('/api/admin/settings/database', { provider: 'custom', ...payload }, { headers: headers() })
      const newActiveProvider: Provider = response.data.activeProvider
      const newCustomConfig: CustomConfigSummary = response.data.customConfig
      setSavedSummary(newCustomConfig?.label ?? null)
      onDatabaseSwitched(newActiveProvider, newCustomConfig)
      void handleViewTables()
      toast({
        title: 'Database switched',
        description: response.data.schemaInitialized
          ? 'The database was empty — its schema was created and a default admin account (admin@tk.sa / admin123) was seeded. The app is now using it.'
          : 'The application is now using the new database configuration.',
      })
    } catch (error: any) {
      toast({ title: 'Unable to save', description: error.response?.data?.error || 'Failed to switch the database.', variant: 'destructive' })
    } finally {
      setSaving(false)
      // Deferred to here (not the start) — resetting earlier would flip schemaReady to false
      // and unmount this very button/dialog mid-click. Runs last, so any further action
      // (success or failure) requires a fresh Test Connection on whatever is typed next.
      resetStatus()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Configuration
        </CardTitle>
        <CardDescription>
          Choose a database type and configure its connection details, then save to switch the application to it immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-sm space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="db-type">Database Type</Label>
            {isActiveDbType && activeProvider && (
              <Badge variant="secondary" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Active: {activeLabel}
              </Badge>
            )}
          </div>
          <Select
            value={dbType}
            onValueChange={(value) => {
              setDbType(value as DbType)
              setErrors({})
              resetStatus()
            }}
            disabled={busy}
          >
            <SelectTrigger id="db-type">
              <SelectValue placeholder="Select a database type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
              <SelectItem value="sqlite">SQLite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TableIcon className="h-4 w-4" />
              Tables in the active database
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleViewTables()} disabled={loadingTables}>
              {loadingTables && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loadingTables ? 'Loading…' : 'Refresh'}
            </Button>
          </div>

          {tablesError && <p className="text-sm text-red-600">{tablesError}</p>}

          {!tablesError && tables && tables.length === 0 && (
            <p className="text-sm text-muted-foreground">No tables found — this database is empty.</p>
          )}

          {!tablesError && tables && tables.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="w-px" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="font-mono text-xs">{t.name}</TableCell>
                      <TableCell className="text-right">{t.rowCount ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/settings/database/tables/${encodeURIComponent(t.name)}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Shows the database currently in use by the app — not whatever is typed in the form below until you switch to it.
          </p>
        </div>

        {dbType === 'sqlite' ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="h-4 w-4" />
              SQLite Configuration
            </div>

            <div className="space-y-2">
              <Label htmlFor="sqlite-path">Database Path</Label>
              <Input
                id="sqlite-path"
                value={sqliteForm.path}
                onChange={(e) => updateSqlite('path', e.target.value)}
                placeholder="./db/custom.db"
                className={errors.path ? 'border-red-500' : ''}
                disabled={busy}
              />
              {errors.path ? (
                <p className="text-sm text-red-600">{errors.path}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  SQLite stores data in a local database file on disk. The path is relative to the <code>prisma/</code> folder — e.g.
                  <code> ./db/custom.db</code> means <code>prisma/db/custom.db</code>.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4" />
              PostgreSQL Configuration
            </div>

            <div className="space-y-2">
              <Label>Connection Method</Label>
              <RadioGroup
                value={connectionMethod}
                onValueChange={(value) => {
                  setConnectionMethod(value as ConnectionMethod)
                  setErrors({})
                  resetStatus()
                }}
                className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                disabled={busy}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="variables" id="method-variables" />
                  <Label htmlFor="method-variables" className="font-normal">Connection Variables</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="url" id="method-url" />
                  <Label htmlFor="method-url" className="font-normal">Connection URL</Label>
                </div>
              </RadioGroup>
            </div>

            {connectionMethod === 'variables' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pg-host">Host <span className="text-red-500">*</span></Label>
                  <Input
                    id="pg-host"
                    value={postgresForm.host}
                    onChange={(e) => updatePostgres('host', e.target.value)}
                    placeholder="localhost"
                    className={errors.host ? 'border-red-500' : ''}
                    disabled={busy}
                  />
                  {errors.host && <p className="text-sm text-red-600">{errors.host}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pg-port">Port <span className="text-red-500">*</span></Label>
                  <Input
                    id="pg-port"
                    inputMode="numeric"
                    value={postgresForm.port}
                    onChange={(e) => updatePostgres('port', e.target.value)}
                    placeholder="5432"
                    className={errors.port ? 'border-red-500' : ''}
                    disabled={busy}
                  />
                  {errors.port && <p className="text-sm text-red-600">{errors.port}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pg-database">Database Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="pg-database"
                    value={postgresForm.database}
                    onChange={(e) => updatePostgres('database', e.target.value)}
                    placeholder="tabadl"
                    className={errors.database ? 'border-red-500' : ''}
                    disabled={busy}
                  />
                  {errors.database && <p className="text-sm text-red-600">{errors.database}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pg-username">Username <span className="text-red-500">*</span></Label>
                  <Input
                    id="pg-username"
                    value={postgresForm.username}
                    onChange={(e) => updatePostgres('username', e.target.value)}
                    placeholder="postgres"
                    className={errors.username ? 'border-red-500' : ''}
                    disabled={busy}
                  />
                  {errors.username && <p className="text-sm text-red-600">{errors.username}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pg-password">Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="pg-password"
                      type={showPassword ? 'text' : 'password'}
                      value={postgresForm.password}
                      onChange={(e) => updatePostgres('password', e.target.value)}
                      placeholder="********"
                      className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="pg-ssl">SSL Mode</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Require SSL when connecting to a managed or remote PostgreSQL instance.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={postgresForm.sslMode}
                    onValueChange={(value) => updatePostgres('sslMode', value as SslMode)}
                    disabled={busy}
                  >
                    <SelectTrigger id="pg-ssl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disable">Disable</SelectItem>
                      <SelectItem value="require">Require</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="pg-url" className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Connection URL (Optional)
                </Label>
                <Input
                  id="pg-url"
                  value={postgresForm.connectionUrl}
                  onChange={(e) => updatePostgres('connectionUrl', e.target.value)}
                  placeholder="postgresql://username:password@host:5432/database"
                  className={errors.connectionUrl ? 'border-red-500' : ''}
                  disabled={busy}
                />
                {errors.connectionUrl ? (
                  <p className="text-sm text-red-600">{errors.connectionUrl}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    When provided, this URL is used instead of the individual Host, Port, Database, Username and Password fields.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {(testStatus !== 'idle' || initializingSchema) && (
          <Alert className={!initializingSchema && testStatus === 'success' ? 'border-green-200 bg-green-50' : !initializingSchema && testStatus === 'error' ? 'border-red-200 bg-red-50' : ''}>
            {(testStatus === 'testing' || initializingSchema) && <Loader2 className="h-4 w-4 animate-spin" />}
            {!initializingSchema && testStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {!initializingSchema && testStatus === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
            <AlertDescription className={!initializingSchema && testStatus === 'success' ? 'text-green-800' : !initializingSchema && testStatus === 'error' ? 'text-red-800' : ''}>
              {initializingSchema ? 'Initializing schema — this can take a few seconds…' : testStatus === 'testing' ? 'Testing connection…' : testMessage}
            </AlertDescription>
          </Alert>
        )}

        {savedSummary && (
          <p className="text-sm text-muted-foreground">
            Last saved configuration: <span className="font-medium text-foreground">{savedSummary}</span>
          </p>
        )}

        <div className="space-y-2 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => void handleTestConnection()} disabled={busy}>
              {testStatus === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void handleInitializeSchema()}
                disabled={busy || !schemaMissing}
              >
                {initializingSchema && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initializingSchema ? 'Initializing…' : 'Initialize Schema'}
              </Button>
              {schemaMissing && (
                <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700">Required — no tables found</Badge>
              )}
            </div>

            {schemaReady && (
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <Button onClick={handleSaveClick} disabled={busy}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Change Database'}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Change database configuration?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This switches the application to the database above immediately — for everyone, right away. Its connection and
                      schema were already verified — if it was empty, a default admin account (admin@tk.sa / admin123) was already
                      created on it. If instead it already has tables from a different, separate setup without your account, admins
                      (including you) may get logged out until it's ready.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleConfirmSave()}>Yes, change database</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {!isVerified
              ? 'Click "Test Connection" first — Initialize Schema and Change Database stay disabled until these exact details are verified.'
              : schemaMissing
                ? 'This database is empty. Click "Initialize Schema" to create its tables — required before you can change to it.'
                : 'Connection verified and schema found — you can now change to this database.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DatabaseSettingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [activeProvider, setActiveProvider] = useState<Provider>('neon')
  const [customConfig, setCustomConfig] = useState<CustomConfigSummary>(null)
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Provider | null>(null)

  const headers = () => {
    const authToken = token || localStorage.getItem('auth-token')
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  useEffect(() => {
    axios.get('/api/admin/settings/database', { headers: headers() })
      .then((response) => {
        setActiveProvider(response.data.activeProvider)
        setCustomConfig(response.data.customConfig ?? null)
        setProviders(response.data.providers)
      })
      .catch((error) => {
        toast({ title: 'Error', description: error.response?.data?.error || 'Failed to load database settings', variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [token])

  const changeProvider = async (provider: Provider) => {
    setSaving(provider)
    try {
      const response = await axios.put('/api/admin/settings/database', { provider }, { headers: headers() })
      setActiveProvider(response.data.activeProvider)
      setProviders(response.data.providers)
      toast({ title: 'Database changed', description: `New requests will use ${labels[provider]}.` })
    } catch (error: any) {
      toast({ title: 'Unable to change database', description: error.response?.data?.error || 'The database provider was not changed.', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <AdminPageTemplate title="Database connection" description="Select the PostgreSQL database used by the application." icon={<Database className="h-6 w-6" />} showConstruction={false}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* <Card>
          <CardHeader>
            <CardTitle>Active database</CardTitle>
            <CardDescription>Changes apply to subsequent server requests in this running instance.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {providers.map((item) => {
                  const enabled = item.configured && item.supported
                  const isActive = item.provider === activeProvider
                  return (
                    <div key={item.provider} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        {isActive ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Database className="h-5 w-5 text-muted-foreground" />}
                        <div>
                          <p className="font-medium">{labels[item.provider]}</p>
                          <p className="text-sm text-muted-foreground">
                            {!item.supported ? 'Unavailable: this provider is not supported.' : !item.configured ? 'Unavailable: database URL is not configured.' : isActive ? 'Currently active' : 'Configured'}
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => void changeProvider(item.provider)} disabled={!enabled || isActive || saving !== null} variant={isActive ? 'secondary' : 'outline'}>
                        {saving === item.provider && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isActive ? 'Active' : 'Use database'}
                      </Button>
                    </div>
                  )
                })}

              </div>
            )}
          </CardContent>
        </Card> */}

        <DatabaseConfigurationSection
          activeProvider={loading ? null : activeProvider}
          activeProviderLoading={loading}
          customConfigSummary={customConfig}
          onDatabaseSwitched={(newActiveProvider, newCustomConfig) => {
            setActiveProvider(newActiveProvider)
            setCustomConfig(newCustomConfig)
          }}
        />
      </div>
    </AdminPageTemplate>
  )
}
