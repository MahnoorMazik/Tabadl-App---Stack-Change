'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Mail, Send, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, MessageSquare } from 'lucide-react'
import axios from 'axios'
import { useLocale } from '@/contexts/LocaleContext'

// Helper function to replace placeholders in strings
function replaceParams(str: string, params: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

interface EmailConfig {
  mailDriver: string
  host: string
  port: number
  username: string
  password: string
  encryption: string
  fromAddress: string
  fromName: string
  tlsServername?: string
  allowBusinessEmailConfig: boolean
  enableNewBusinessEmail: boolean
  enableNewSubscriptionEmail: boolean
  enableWelcomeEmail: boolean
  welcomeEmailSubject: string
  welcomeEmailBody: string
  contactEmail: string
  contactPhone: string
  businessConsultationRecipients: string[]
  staffWhatsAppNumbers: string[]
  whatsappAccessToken: string
  whatsappApiVersion: string
  whatsappPhoneNumberId: string
  whatsappDocumentUrl: string
}

export default function EmailSettingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const { t } = useLocale()
  
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [testResult, setTestResult] = useState<{ 
    success: boolean
    message: string
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({})
  const [savingContact, setSavingContact] = useState(false)
  const [savingRecipients, setSavingRecipients] = useState(false)
  const [savingStaffPhones, setSavingStaffPhones] = useState(false)
  const [savingWhatsApp, setSavingWhatsApp] = useState(false)
  
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    mailDriver: 'SMTP',
    host: 'smtp.gmail.com',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls',
    fromAddress: '',
    fromName: 'Tabadl Alkon CRM',
    tlsServername: '',
    allowBusinessEmailConfig: true,
    enableNewBusinessEmail: true,
    enableNewSubscriptionEmail: true,
    enableWelcomeEmail: true,
    welcomeEmailSubject: 'Welcome to Tabadl Alkon CRM',
    welcomeEmailBody: '<p>Welcome to Tabadl Alkon CRM</p>',
    contactEmail: '',
    contactPhone: '',
    businessConsultationRecipients: [],
    staffWhatsAppNumbers: [],
    whatsappAccessToken: '',
    whatsappApiVersion: '',
    whatsappPhoneNumberId: '',
    whatsappDocumentUrl: ''
  })

  const [testEmail, setTestEmail] = useState('')
  const [newRecipient, setNewRecipient] = useState('')
  const [newStaffPhone, setNewStaffPhone] = useState('')

  // Get auth headers helper - for APIs that need it
  const getAuthHeaders = () => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  useEffect(() => {
    fetchEmailConfig()
  }, [token])

  const fetchEmailConfig = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/settings/email', {
        headers: getAuthHeaders()
      })
      
      const emailConfigData = response.data?.data?.emailConfig || response.data?.emailConfig
      const configured = response.data?.data?.isConfigured ?? response.data?.isConfigured ?? false
      
      setIsConfigured(Boolean(configured))
      
      if (emailConfigData) {
        const configWithDefaults = {
          ...emailConfigData,
          businessConsultationRecipients: emailConfigData.businessConsultationRecipients || [],
          staffWhatsAppNumbers: emailConfigData.staffWhatsAppNumbers || [],
          whatsappAccessToken: emailConfigData.whatsappAccessToken || '',
          whatsappApiVersion: emailConfigData.whatsappApiVersion || '',
          whatsappPhoneNumberId: emailConfigData.whatsappPhoneNumberId || '',
          whatsappDocumentUrl: emailConfigData.whatsappDocumentUrl || ''
        }
        setEmailConfig(configWithDefaults)
      }
    } catch (error) {
      console.error('Error fetching email config:', error)
      toast({
        title: 'Error',
        description: t('admin.settings.email.loadFailed') || 'Failed to load email configuration',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const validateFields = () => {
    const newErrors: { [key: string]: boolean } = {}
    
    if (!emailConfig.host) newErrors.host = true
    if (!emailConfig.port) newErrors.port = true
    if (!emailConfig.username) newErrors.username = true
    if (!emailConfig.password) newErrors.password = true
    if (!emailConfig.fromAddress) newErrors.fromAddress = true
    if (!emailConfig.fromName) newErrors.fromName = true
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    // Validate all required fields
    if (!validateFields()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await axios.post('/api/settings/email', emailConfig, {
        headers: getAuthHeaders()
      })
      
      setErrors({})
      setIsConfigured(true)
      
      toast({
        title: 'Success',
        description: t('admin.settings.email.saved') || 'Email configuration saved successfully',
      })
    } catch (error: any) {
      console.error('Error saving email config:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.error || t('admin.settings.email.saveFailed') || 'Failed to save email configuration',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    console.log('📧 Test Email button clicked')
    
    if (!testEmail) {
      console.error('❌ No test email provided')
      toast({
        title: 'Error',
        description: 'Please enter a test email address',
        variant: 'destructive'
      })
      return
    }

    // Validate required fields
    const requiredFields = ['host', 'username', 'password', 'fromAddress', 'fromName']
    const missingFields = requiredFields.filter(field => !emailConfig[field as keyof EmailConfig])
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields)
      toast({
        title: 'Error',
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: 'destructive'
      })
      return
    }

    setTesting(true)
    setTestResult(null)
    
    try {
      console.log('📧 Sending test email request...')
      console.log('📧 Test email:', testEmail)
      console.log('📧 Config:', {
        host: emailConfig.host,
        port: emailConfig.port,
        username: emailConfig.username,
        fromAddress: emailConfig.fromAddress,
        encryption: emailConfig.encryption,
        hasPassword: !!emailConfig.password
      })

      // No need to send Authorization header - withAuth middleware handles it via cookies
      const response = await axios.post('/api/settings/email/test', {
        ...emailConfig,
        testEmail
      }, {
        withCredentials: true // Important for cookie-based auth
      })
      
      console.log('📧 Response:', response.data)
      
      if (response.data.success) {
        setTestResult({
          success: true,
          message: `✅ Test email sent successfully to ${testEmail}`
        })
        
        toast({
          title: 'Success ✅',
          description: `Test email sent to ${testEmail}! Check your inbox.`,
        })
      } else {
        throw new Error(response.data.error || 'Failed to send test email')
      }
    } catch (error: any) {
      console.error('❌ Email test error:', error)
      
      let errorMsg = 'Failed to send test email'
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error
      } else if (error.response?.data?.details) {
        errorMsg = error.response.data.details
      } else if (error.message) {
        errorMsg = error.message
      }
      
      setTestResult({
        success: false,
        message: `❌ ${errorMsg}`
      })
      
      toast({
        title: 'Error ❌',
        description: errorMsg,
        variant: 'destructive'
      })
    } finally {
      setTesting(false)
    }
  }

  const updateConfig = (field: keyof EmailConfig, value: string | number | boolean) => {
    setEmailConfig(prev => ({ ...prev, [field]: value }))
  }

  const addRecipient = () => {
    if (newRecipient.trim() && !(emailConfig.businessConsultationRecipients || []).includes(newRecipient.trim())) {
      setEmailConfig(prev => ({
        ...prev,
        businessConsultationRecipients: [...(prev.businessConsultationRecipients || []), newRecipient.trim()]
      }))
      setNewRecipient('')
    }
  }

  const removeRecipient = (index: number) => {
    setEmailConfig(prev => ({
      ...prev,
      businessConsultationRecipients: (prev.businessConsultationRecipients || []).filter((_, i) => i !== index)
    }))
  }

  const handleRecipientKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addRecipient()
    }
  }

  const addStaffPhone = () => {
    if (newStaffPhone.trim() && !(emailConfig.staffWhatsAppNumbers || []).includes(newStaffPhone.trim())) {
      setEmailConfig(prev => ({
        ...prev,
        staffWhatsAppNumbers: [...(prev.staffWhatsAppNumbers || []), newStaffPhone.trim()]
      }))
      setNewStaffPhone('')
    }
  }

  const removeStaffPhone = (index: number) => {
    setEmailConfig(prev => ({
      ...prev,
      staffWhatsAppNumbers: (prev.staffWhatsAppNumbers || []).filter((_, i) => i !== index)
    }))
  }

  const handleStaffPhoneKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addStaffPhone()
    }
  }

  const handleSaveStaffPhones = async () => {
    setSavingStaffPhones(true)
    try {
      await axios.post('/api/settings/email', {
        ...emailConfig,
        staffWhatsAppNumbers: emailConfig.staffWhatsAppNumbers
      }, {
        headers: getAuthHeaders()
      })
      
      toast({
        title: 'Success',
        description: t('admin.settings.email.whatsappSaved') || 'Staff WhatsApp numbers saved successfully',
      })
    } catch (error: any) {
      console.error('Error saving staff phone numbers:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.error || t('admin.settings.email.whatsappSaveFailed') || 'Failed to save staff phone numbers',
        variant: 'destructive'
      })
    } finally {
      setSavingStaffPhones(false)
    }
  }

  const handleSaveContactInfo = async () => {
    setSavingContact(true)
    try {
      await axios.post('/api/settings/email/contact', {
        contactEmail: emailConfig.contactEmail,
        contactPhone: emailConfig.contactPhone
      }, {
        headers: getAuthHeaders()
      })
      
      toast({
        title: 'Success',
        description: 'Contact information saved successfully',
      })
    } catch (error: any) {
      console.error('Error saving contact info:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save contact information',
        variant: 'destructive'
      })
    } finally {
      setSavingContact(false)
    }
  }

  const handleSaveRecipients = async () => {
    setSavingRecipients(true)
    try {
      await axios.post('/api/settings/email/recipients', {
        businessConsultationRecipients: emailConfig.businessConsultationRecipients
      }, {
        headers: getAuthHeaders()
      })
      
      toast({
        title: 'Success',
        description: t('admin.settings.email.recipientsSaved') || 'Business consultation recipients saved successfully',
      })
    } catch (error: any) {
      console.error('Error saving recipients:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.error || t('admin.settings.email.recipientsSaveFailed') || 'Failed to save recipients',
        variant: 'destructive'
      })
    } finally {
      setSavingRecipients(false)
    }
  }

  const handleSaveWhatsApp = async () => {
    setSavingWhatsApp(true)
    
    try {
      // Fetch current settings first to ensure we have all required fields
      const currentResponse = await axios.get('/api/settings/email', {
        headers: getAuthHeaders()
      })
      
      const currentConfig = currentResponse.data?.data?.emailConfig || currentResponse.data?.emailConfig || emailConfig
      
      // Update WhatsApp configuration
      await axios.post('/api/settings/email', {
        ...currentConfig,
        whatsappAccessToken: emailConfig.whatsappAccessToken,
        whatsappApiVersion: emailConfig.whatsappApiVersion,
        whatsappPhoneNumberId: emailConfig.whatsappPhoneNumberId,
        whatsappDocumentUrl: emailConfig.whatsappDocumentUrl
      }, {
        headers: getAuthHeaders()
      })
      
      toast({
        title: t('common.success'),
        description: t('admin.settings.email.whatsappConfigSaved') || 'WhatsApp configuration saved successfully',
      })
    } catch (error: any) {
      console.error('Error saving WhatsApp configuration:', error)
      const errorDetails = error.response?.data?.details || error.response?.data?.error || t('admin.settings.email.whatsappConfigSaveFailed') || 'Failed to save WhatsApp configuration'
      toast({
        title: t('common.error'),
        description: errorDetails,
        variant: 'destructive'
      })
    } finally {
      setSavingWhatsApp(false)
    }
  }

  return (
    <AdminPageTemplate
      title={t('admin.sidebar.emailSettings')}
      description={t('admin.settings.email.description') || 'Configure email settings for the CRM system'}
      icon={<Mail className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {!loading && !isConfigured && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              SMTP settings are not saved in the database yet. Application status emails will not send until you enter the SMTP password and click <strong>Save Configuration</strong>. Test Email alone does not save settings.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Mail Driver & Host Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('admin.settings.email.mailDriverHost') || 'Mail Driver & Host Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mail-driver">{t('admin.settings.email.mailDriver') || 'Mail Driver'}</Label>
                <select
                  id="mail-driver"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={emailConfig.mailDriver}
                  onChange={(e) => updateConfig('mailDriver', e.target.value)}
                  disabled
                >
                  <option value="SMTP">SMTP</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">{t('admin.settings.email.smtpOnly') || 'Only SMTP is currently supported'}</p>
              </div>
              <div>
                <Label htmlFor="tls-servername">{t('admin.settings.email.tlsServername') || 'TLS Servername (SNI)'}</Label>
                <Input
                  id="tls-servername"
                  value={emailConfig.tlsServername || ''}
                  onChange={(e) => updateConfig('tlsServername', e.target.value)}
                  placeholder="smtp.your-mail-host.com"
                />
                <p className="text-sm text-gray-500 mt-1">{t('admin.settings.email.tlsServernameHint') || 'Hostname on the SMTP certificate (set when using an IP)'}</p>
              </div>
              <div>
                <Label htmlFor="host">{t('admin.settings.email.host') || 'Host'} <span className="text-red-500">*</span></Label>
                <Input
                  id="host"
                  value={emailConfig.host}
                  onChange={(e) => {
                    updateConfig('host', e.target.value)
                    if (errors.host) setErrors(prev => ({ ...prev, host: false }))
                  }}
                  placeholder="smtp.gmail.com"
                  required
                  className={errors.host ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="port">{t('admin.settings.email.port') || 'Port'} <span className="text-red-500">*</span></Label>
                <Input
                  id="port"
                  type="number"
                  value={emailConfig.port}
                  onChange={(e) => {
                    updateConfig('port', parseInt(e.target.value))
                    if (errors.port) setErrors(prev => ({ ...prev, port: false }))
                  }}
                  placeholder="587"
                  required
                  className={errors.port ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="username">{t('admin.settings.email.username') || 'Username'} <span className="text-red-500">*</span></Label>
                <Input
                  id="username"
                  value={emailConfig.username}
                  onChange={(e) => {
                    updateConfig('username', e.target.value)
                    if (errors.username) setErrors(prev => ({ ...prev, username: false }))
                  }}
                  placeholder="your-email@gmail.com"
                  required
                  className={errors.username ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="password">{t('auth.password')} <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={emailConfig.password}
                    onChange={(e) => {
                      updateConfig('password', e.target.value)
                      if (errors.password) setErrors(prev => ({ ...prev, password: false }))
                    }}
                    placeholder={t('admin.settings.email.passwordPlaceholder') || 'Your email app password'}
                    required
                    className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="encryption">{t('admin.settings.email.encryption') || 'Encryption'}</Label>
                <select
                  id="encryption"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={emailConfig.encryption}
                  onChange={(e) => updateConfig('encryption', e.target.value)}
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">{t('common.none')}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="from-address">{t('admin.settings.email.fromAddress') || 'From Address'} <span className="text-red-500">*</span></Label>
                <Input
                  id="from-address"
                  type="email"
                  value={emailConfig.fromAddress}
                  onChange={(e) => {
                    updateConfig('fromAddress', e.target.value)
                    if (errors.fromAddress) setErrors(prev => ({ ...prev, fromAddress: false }))
                  }}
                  placeholder="your-email@gmail.com"
                  required
                  className={errors.fromAddress ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="from-name">{t('admin.settings.email.fromName') || 'From Name'} <span className="text-red-500">*</span></Label>
                <Input
                  id="from-name"
                  value={emailConfig.fromName}
                  onChange={(e) => {
                    updateConfig('fromName', e.target.value)
                    if (errors.fromName) setErrors(prev => ({ ...prev, fromName: false }))
                  }}
                  placeholder="Tabadl Alkon CRM"
                  required
                  className={errors.fromName ? 'border-red-500' : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t('admin.settings.email.testEmail') || 'Test Email Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-email">{t('admin.settings.email.testEmailAddress') || 'Test Email Address'}</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>

            {testResult && (
              <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                  {testResult.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={handleTest} 
                disabled={testing || !testEmail}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('admin.settings.email.testing') || 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t('admin.settings.email.sendTest') || 'Send Test Email'}
                  </>
                )}
              </Button>
              
              <Button onClick={handleSave} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  t('admin.settings.email.saveConfiguration') || 'Save Configuration'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('admin.settings.email.companyContact') || 'Company Contact Information'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              {t('admin.settings.email.companyContactDesc') || 'This information will be used in confirmation emails and other customer-facing communications'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-email">{t('admin.settings.email.contactEmail') || 'Contact Email'}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={emailConfig.contactEmail}
                  onChange={(e) => updateConfig('contactEmail', e.target.value)}
                  placeholder="info@tabadlalkon.com"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t('admin.settings.email.contactEmailHint') || 'Email address displayed in confirmation emails'}
                </p>
              </div>
              <div>
                <Label htmlFor="contact-phone">{t('admin.settings.email.contactPhone') || 'Contact Phone'}</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={emailConfig.contactPhone}
                  onChange={(e) => updateConfig('contactPhone', e.target.value)}
                  placeholder="+966 50 000 0000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t('admin.settings.email.contactPhoneHint') || 'Phone number displayed in confirmation emails'}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveContactInfo} disabled={savingContact}>
                {savingContact ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('admin.settings.email.saveContactInfo') || 'Save Contact Information'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Consultation Form Email Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('admin.settings.email.businessRecipients') || 'Business Consultation Form Email Recipients'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              {t('admin.settings.email.businessRecipientsDesc') || 'Email addresses that will receive notifications when business consultation forms are submitted'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyPress={handleRecipientKeyPress}
                  placeholder={t('admin.settings.email.enterEmail') || 'Enter email address'}
                  className="flex-1"
                />
                <Button onClick={addRecipient} disabled={!newRecipient.trim()}>
                  {t('admin.settings.email.addRecipient') || 'Add Recipient'}
                </Button>
              </div>
              
              {(emailConfig.businessConsultationRecipients || []).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.settings.email.currentRecipients') || 'Current Recipients'}:</Label>
                  <div className="space-y-2">
                    {(emailConfig.businessConsultationRecipients || []).map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                        <span className="text-sm">{recipient}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {t('common.remove')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(emailConfig.businessConsultationRecipients || []).length === 0 && (
                <p className="text-sm text-gray-500 italic">{t('admin.settings.email.noRecipients') || 'No recipients added yet'}</p>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveRecipients} disabled={savingRecipients}>
                {savingRecipients ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('admin.settings.email.saveRecipients') || 'Save Recipients'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staff WhatsApp Notification Numbers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t('admin.settings.email.staffWhatsApp') || 'Staff WhatsApp Notification Numbers'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              {t('admin.settings.email.staffWhatsAppDesc') || 'WhatsApp phone numbers that will receive notifications when business consultation forms are submitted (e.g., 923189108310)'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="tel"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  onKeyPress={handleStaffPhoneKeyPress}
                  placeholder={t('admin.settings.email.enterPhone') || 'Enter phone number (e.g., 923189108310)'}
                  className="flex-1"
                />
                <Button onClick={addStaffPhone} disabled={!newStaffPhone.trim()}>
                  {t('admin.settings.email.addPhone') || 'Add Phone'}
                </Button>
              </div>
              
              {(emailConfig.staffWhatsAppNumbers || []).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.settings.email.currentStaffPhones') || 'Current Staff Phone Numbers'}:</Label>
                  <div className="space-y-2">
                    {(emailConfig.staffWhatsAppNumbers || []).map((phone, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                        <span className="text-sm">{phone}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeStaffPhone(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {t('common.remove')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(emailConfig.staffWhatsAppNumbers || []).length === 0 && (
                <p className="text-sm text-gray-500 italic">{t('admin.settings.email.noStaffPhones') || 'No staff phone numbers added yet'}</p>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveStaffPhones} disabled={savingStaffPhones}>
                {savingStaffPhones ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('admin.settings.email.saveStaffPhones') || 'Save Staff Phone Numbers'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Notifications Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('admin.settings.email.whatsappConfig') || 'WhatsApp Notifications Configuration'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              {t('admin.settings.email.whatsappConfigDesc') || 'Configure WhatsApp Business API settings. WhatsApp notifications will be automatically enabled when all required fields are set.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-access-token" className="text-base">
                {t('admin.settings.email.whatsappAccessToken') || 'WhatsApp Access Token'}
              </Label>
              <div className="relative">
                <Input
                  id="whatsapp-access-token"
                  type={showPassword ? 'text' : 'password'}
                  value={emailConfig.whatsappAccessToken}
                  onChange={(e) => updateConfig('whatsappAccessToken', e.target.value)}
                  placeholder={t('admin.settings.email.whatsappAccessTokenPlaceholder') || 'Enter your WhatsApp Business API access token'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {t('admin.settings.email.whatsappAccessTokenHint') || 'Your WhatsApp Business API access token from Meta Business Suite'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-api-version">
                  {t('admin.settings.email.whatsappApiVersion') || 'WhatsApp API Version'}
                </Label>
                <Input
                  id="whatsapp-api-version"
                  value={emailConfig.whatsappApiVersion}
                  onChange={(e) => updateConfig('whatsappApiVersion', e.target.value)}
                  placeholder={t('admin.settings.email.whatsappApiVersionPlaceholder') || 'e.g., v21.0, v18.0, v19.0'}
                />
                <p className="text-sm text-gray-500">
                  {t('admin.settings.email.whatsappApiVersionHint') || 'Graph API version (e.g., v21.0, v18.0, v19.0)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone-number-id">
                  {t('admin.settings.email.whatsappPhoneNumberId') || 'WhatsApp Phone Number ID'}
                </Label>
                <Input
                  id="whatsapp-phone-number-id"
                  value={emailConfig.whatsappPhoneNumberId}
                  onChange={(e) => updateConfig('whatsappPhoneNumberId', e.target.value)}
                  placeholder={t('admin.settings.email.whatsappPhoneNumberIdPlaceholder') || 'Enter your phone number ID'}
                />
                <p className="text-sm text-gray-500">
                  {t('admin.settings.email.whatsappPhoneNumberIdHint') || 'Your WhatsApp Business phone number ID'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-document-url">
                {t('admin.settings.email.whatsappDocumentUrl') || 'WhatsApp Document URL'} ({t('common.optional')})
              </Label>
              <Input
                id="whatsapp-document-url"
                value={emailConfig.whatsappDocumentUrl}
                onChange={(e) => updateConfig('whatsappDocumentUrl', e.target.value)}
                placeholder={t('admin.settings.email.whatsappDocumentUrlPlaceholder') || 'Path or URL to document PDF'}
              />
              <p className="text-sm text-gray-500">
                {t('admin.settings.email.whatsappDocumentUrlHint') || 'Document attached in WhatsApp notifications (e.g. company profile PDF).'}
              </p>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveWhatsApp}
                disabled={loading || savingWhatsApp}
              >
                {savingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('admin.settings.email.saveWhatsAppConfig') || 'Save WhatsApp Configuration'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageTemplate>
  )
}