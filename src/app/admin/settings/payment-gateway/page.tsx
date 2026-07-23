'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CreditCard, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import axios from 'axios'

interface PaymentGatewayConfig {
  merchantId: string
  password: string
  apiKey: string
  environment: 'sandbox' | 'production'
  enabled: boolean
  configured?: boolean
}

export default function PaymentGatewaySettingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [config, setConfig] = useState<PaymentGatewayConfig>({
    merchantId: '',
    password: '',
    apiKey: '',
    environment: 'sandbox',
    enabled: false,
  })

  const authHeaders = () => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  useEffect(() => {
    fetchConfig()
  }, [token])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/settings/payment-gateway', { headers: authHeaders() })
      setConfig({
        merchantId: response.data.merchantId || '',
        password: response.data.password || '',
        apiKey: response.data.apiKey || '',
        environment: response.data.environment || 'sandbox',
        enabled: response.data.enabled ?? false,
        configured: response.data.configured,
      })
    } catch (error) {
      console.error('Failed to load payment gateway settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load payment gateway settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.merchantId.trim()) {
      toast({ title: 'Validation Error', description: 'Merchant ID is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      await axios.put('/api/settings/payment-gateway', config, { headers: authHeaders() })
      toast({ title: 'Success', description: 'Payment gateway settings saved' })
      await fetchConfig()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const webhookPath = '/api/payments/edfapay/webhook'

  return (
    <AdminPageTemplate
      title="Payment Gateway"
      description="Configure EdfaPay for online invoice payments"
      icon={<CreditCard className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Alert className={config.enabled ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
              {config.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <AlertDescription>
                {config.enabled
                  ? `EdfaPay is enabled (${config.environment}). Clients can pay invoices online.`
                  : 'Online payments are disabled. Enable the gateway after configuring credentials.'}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>EdfaPay Configuration</CardTitle>
                  <CardDescription>
                    Merchant credentials. Environment variables can be used as fallback.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="enabled">Enable Online Payments</Label>
                      <p className="text-sm text-muted-foreground">Allow clients to pay invoices via EdfaPay</p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="merchantId">Merchant ID *</Label>
                      <Input
                        id="merchantId"
                        value={config.merchantId}
                        onChange={(e) => setConfig((c) => ({ ...c, merchantId: e.target.value }))}
                        placeholder="Merchant UUID"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="environment">Environment</Label>
                      <select
                        id="environment"
                        value={config.environment}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            environment: e.target.value as 'sandbox' | 'production',
                          }))
                        }
                        aria-label="EdfaPay environment"
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="sandbox">Sandbox (testing)</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative mt-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={config.password}
                          onChange={(e) => setConfig((c) => ({ ...c, password: e.target.value }))}
                          placeholder="Leave unchanged if already set"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="apiKey">API Key (optional)</Label>
                      <div className="relative mt-1">
                        <Input
                          id="apiKey"
                          type={showApiKey ? 'text' : 'password'}
                          value={config.apiKey}
                          onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
                          placeholder="Optional"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Settings'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook</CardTitle>
                  <CardDescription>Register this endpoint in your EdfaPay merchant dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Webhook path</Label>
                    <code className="block rounded bg-muted p-3 text-sm break-all mt-1">
                      {webhookPath}
                    </code>
                    <p className="text-sm text-muted-foreground mt-2">
                      Full endpoint: your site origin + path above
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminPageTemplate>
  )
}
