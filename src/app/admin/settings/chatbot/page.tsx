'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Bot, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Globe, MessageSquare, Mail } from 'lucide-react'
import axios from 'axios'
import { CHAT_CHANNELS } from '@/lib/chatbot/prompt'

interface ChatbotConfig {
  enabled: boolean
  enabledWebsiteChat: boolean
  enabledWhatsApp: boolean
  enabledEmail: boolean
  botName: string
  ollamaApiKey: string
  ollamaHost: string
  ollamaModel: string
  temperature: number
  systemPrompt: string
  hasOllamaApiKey?: boolean
  ollamaApiKeyHint?: string | null
  botConfigured?: boolean
}

const CHANNEL_ICONS = {
  website: Globe,
  whatsapp: MessageSquare,
  email: Mail,
}

export default function ChatbotSettingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [config, setConfig] = useState<ChatbotConfig>({
    enabled: false,
    enabledWebsiteChat: false,
    enabledWhatsApp: false,
    enabledEmail: false,
    botName: 'TK Assistant',
    ollamaApiKey: '',
    ollamaHost: '',
    ollamaModel: 'qwen3:8b-cloud',
    temperature: 0.7,
    systemPrompt: '',
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
      const response = await axios.get('/api/settings/chatbot', { headers: authHeaders() })
      setConfig({
        enabled: response.data.enabled ?? false,
        enabledWebsiteChat: response.data.enabledWebsiteChat ?? false,
        enabledWhatsApp: response.data.enabledWhatsApp ?? false,
        enabledEmail: response.data.enabledEmail ?? false,
        botName: response.data.botName || 'TK Assistant',
        ollamaApiKey: '',
        ollamaHost: response.data.ollamaHost || '',
        ollamaModel: response.data.ollamaModel || 'qwen3:8b-cloud',
        temperature: response.data.temperature ?? 0.7,
        systemPrompt: response.data.systemPrompt || '',
        hasOllamaApiKey: response.data.hasOllamaApiKey,
        ollamaApiKeyHint: response.data.ollamaApiKeyHint,
        botConfigured: response.data.botConfigured,
      })
    } catch (error) {
      console.error('Failed to load chatbot settings:', error)
      toast({ title: 'Error', description: 'Failed to load chatbot settings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.put('/api/settings/chatbot', config, { headers: authHeaders() })
      toast({ title: 'Success', description: 'Chatbot settings saved' })
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

  const toggleChannel = (channel: 'enabledWebsiteChat' | 'enabledWhatsApp' | 'enabledEmail', value: boolean) => {
    setConfig((c) => ({ ...c, [channel]: value }))
  }

  return (
    <AdminPageTemplate
      title="AI Chatbot"
      description="Configure the AI assistant and choose which channels it responds on"
      icon={<Bot className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Alert className={config.botConfigured && config.enabled ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
              {config.botConfigured && config.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <AlertDescription>
                {config.botConfigured && config.enabled
                  ? `${config.botName} is active on enabled channels.`
                  : 'Enable the chatbot and add an Ollama API key to go live.'}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Master Switch</CardTitle>
                  <CardDescription>Turn the AI assistant on or off globally</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="enabled">Enable AI Chatbot</Label>
                      <p className="text-sm text-muted-foreground">Requires Ollama API key</p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Channels</CardTitle>
                  <CardDescription>Where the bot responds automatically</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CHAT_CHANNELS.map((channel) => {
                    const Icon = CHANNEL_ICONS[channel.id]
                    const fieldKey =
                      channel.id === 'website'
                        ? 'enabledWebsiteChat'
                        : channel.id === 'whatsapp'
                          ? 'enabledWhatsApp'
                          : 'enabledEmail'

                    return (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{channel.label}</span>
                          {!channel.available && (
                            <Badge variant="secondary" className="text-xs shrink-0">Soon</Badge>
                          )}
                        </div>
                        <Switch
                          checked={config[fieldKey as keyof ChatbotConfig] as boolean}
                          disabled={!channel.available || !config.enabled}
                          onCheckedChange={(checked) =>
                            toggleChannel(fieldKey as 'enabledWebsiteChat' | 'enabledWhatsApp' | 'enabledEmail', checked)
                          }
                          aria-label={`Enable ${channel.label}`}
                        />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ollama Cloud</CardTitle>
                  <CardDescription>API credentials and model settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="botName">Bot Display Name</Label>
                      <Input
                        id="botName"
                        value={config.botName}
                        onChange={(e) => setConfig((c) => ({ ...c, botName: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ollamaModel">Model</Label>
                      <Input
                        id="ollamaModel"
                        value={config.ollamaModel}
                        onChange={(e) => setConfig((c) => ({ ...c, ollamaModel: e.target.value }))}
                        className="mt-1"
                        placeholder="e.g. qwen3:8b-cloud"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ollamaApiKey">API Key</Label>
                    <div className="relative mt-1">
                      <Input
                        id="ollamaApiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={config.ollamaApiKey}
                        onChange={(e) => setConfig((c) => ({ ...c, ollamaApiKey: e.target.value }))}
                        placeholder={
                          config.hasOllamaApiKey
                            ? `Saved ${config.ollamaApiKeyHint ?? ''}`
                            : 'Paste your API key'
                        }
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

                  <div>
                    <Label htmlFor="temperature">Temperature ({config.temperature.toFixed(1)})</Label>
                    <input
                      id="temperature"
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.1}
                      value={config.temperature}
                      onChange={(e) => setConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
                      className="w-full mt-2"
                      aria-label="Model temperature"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>System Prompt</CardTitle>
                  <CardDescription>Instructions for tone, scope, and behaviour</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <Textarea
                    value={config.systemPrompt}
                    onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
                    rows={14}
                    className="font-mono text-sm h-full min-h-[280px]"
                    placeholder="Instructions for the AI assistant..."
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
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
          </>
        )}
      </div>
    </AdminPageTemplate>
  )
}
