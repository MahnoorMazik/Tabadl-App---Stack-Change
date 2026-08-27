'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Database, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

type Provider = 'neon' | 'supabase' | 'sqlite'
type ProviderStatus = { provider: Provider; configured: boolean; supported: boolean }

const labels: Record<Provider, string> = {
  neon: 'Neon PostgreSQL',
  supabase: 'Supabase MySQL',
  sqlite: 'SQLite',
}

export default function DatabaseSettingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [activeProvider, setActiveProvider] = useState<Provider>('neon')
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
      <div className="max-w-3xl mx-auto">
        <Card>
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
        </Card>
      </div>
    </AdminPageTemplate>
  )
}
