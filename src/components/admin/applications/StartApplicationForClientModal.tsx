'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  AREA_OF_INTEREST_OPTIONS,
  AreaOfInterestKey,
} from '@/components/admin/forms/types'
import { ArrowLeft, Check, Loader2, Search, UserRound } from 'lucide-react'

import { useLocale } from '@/contexts/LocaleContext'

type ClientOption = {
  id: string
  name: string
  email: string
  company?: string | null
  clientNumber?: string | null
}

type StartApplicationForClientModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted?: (applicationId: string) => void
}

export function StartApplicationForClientModal({
  open,
  onOpenChange,
  onStarted,
}: StartApplicationForClientModalProps) {
  const { toast } = useToast()
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'

  const getAreaLabel = (area: string) => {
    switch (area) {
      case 'CR':
        return t('admin.wizards.areaOption.cr')
      case 'PR':
        return t('admin.wizards.areaOption.pr')
      default:
        return area
    }
  }

  const [step, setStep] = useState<'client' | 'type'>('client')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [selectedArea, setSelectedArea] = useState<AreaOfInterestKey | null>(null)
  const [starting, setStarting] = useState(false)

  const reset = useCallback(() => {
    setStep('client')
    setSearch('')
    setSelectedClient(null)
    setSelectedArea(null)
    setStarting(false)
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const loadClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const res = await axios.get('/api/clients')
      const list = (res.data?.data?.clients ?? []) as Array<{
        id: string
        name?: string | null
        email?: string | null
        company?: string | null
        clientNumber?: string | null
        user?: { name?: string | null; email?: string | null } | null
      }>
      setClients(
        list.map((c) => ({
          id: c.id,
          name: c.name || c.user?.name || 'Unnamed client',
          email: c.email || c.user?.email || '',
          company: c.company,
          clientNumber: c.clientNumber,
        }))
      )
    } catch (error: any) {
      setClients([])
      toast({
        title: 'Failed to load clients',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setLoadingClients(false)
    }
  }, [toast])

  useEffect(() => {
    if (!open) return
    void loadClients()
  }, [open, loadClients])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.clientNumber || '').toLowerCase().includes(q)
    )
  }, [clients, search])

  const handleStart = async () => {
    if (!selectedClient || !selectedArea) return
    setStarting(true)
    try {
      const res = await axios.post('/api/admin/wizard-applications', {
        clientId: selectedClient.id,
        areaOfInterest: selectedArea,
      })
      const application = res.data?.data?.application
      const resumed = Boolean(res.data?.data?.resumed)
      if (!application?.id) {
        throw new Error('Application was not created')
      }

      toast({
        title: resumed ? 'Draft resumed' : 'Application started',
        description: resumed
          ? `Opened existing ${selectedArea} draft for ${selectedClient.name}.`
          : `${selectedArea} application started for ${selectedClient.name}.`,
      })

      handleOpenChange(false)
      onStarted?.(application.id)
      window.open(
        `/admin/applications/${application.id}`,
        '_blank',
        'noopener,noreferrer'
      )
    } catch (error: any) {
      toast({
        title: 'Could not start application',
        description: error.response?.data?.error?.message || error.message,
        variant: 'destructive',
      })
    } finally {
      setStarting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className={cn("px-5 pt-5 pb-3 border-b space-y-1", isRTL ? "text-right" : "text-left")}>
          <DialogTitle>{t('admin.applications.startForClient')}</DialogTitle>
          <DialogDescription>
            {step === 'client'
              ? isRTL ? 'اختر عميلاً مسجلاً، ثم اختر نوع الطلب (تسجيل الشركة أو خاص).' : 'Select a registered client, then choose CR or PR.'
              : isRTL ? `اختر نوع الطلب لـ ${selectedClient?.name}.` : `Choose the application type for ${selectedClient?.name}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {step === 'client' ? (
            <>
              <div className="relative">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none", isRTL ? "right-2.5" : "left-2.5")} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isRTL ? "ابحث حسب الاسم، البريد، الشركة..." : "Search by name, email, company…"}
                  className={cn("h-9", isRTL ? "pr-8 text-right" : "pl-8 text-left")}
                  autoFocus
                />
              </div>

              <ScrollArea className="h-72 rounded-lg border">
                {loadingClients ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10 px-4">
                    {search.trim()
                      ? isRTL ? 'لا يوجد عملاء يطابقون بحثك.' : 'No clients match your search.'
                      : isRTL ? 'لم يتم العثور على عملاء.' : 'No clients found.'}
                  </p>
                ) : (
                  <ul className="p-1.5 space-y-0.5">
                    {filteredClients.map((client) => {
                      const active = selectedClient?.id === client.id
                      return (
                        <li key={client.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedClient(client)}
                            className={cn(
                              'w-full rounded-md px-3 py-2.5 transition-colors',
                              isRTL ? 'text-right' : 'text-left',
                              active
                                ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200'
                                : 'hover:bg-muted/60'
                            )}
                          >
                            <div className={cn("flex items-start gap-2.5", isRTL ? "flex-row-reverse" : "flex-row")}>
                              <span
                                className={cn(
                                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                                  active
                                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                    : 'border-border bg-muted text-muted-foreground'
                                )}
                              >
                                {active ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <UserRound className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium truncate">
                                  {client.name}
                                </span>
                                <span className="block text-xs text-muted-foreground truncate">
                                  {client.email || (isRTL ? 'لا يوجد بريد' : 'No email')}
                                  {client.company ? ` · ${client.company}` : ''}
                                </span>
                              </span>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="space-y-3">
              <div className={cn("rounded-lg border bg-muted/30 px-3 py-2.5", isRTL ? "text-right" : "text-left")}>
                <p className="text-xs text-muted-foreground">{isRTL ? 'العميل المحدد' : 'Selected client'}</p>
                <p className="text-sm font-medium">{selectedClient?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedClient?.email}
                </p>
              </div>

              <div className="space-y-2">
                <Label className={cn("block", isRTL ? "text-right" : "text-left")}>{t('client.applications.applicationType')}</Label>
                <div className="grid gap-2">
                  {AREA_OF_INTEREST_OPTIONS.map((option) => {
                    const active = selectedArea === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSelectedArea(option.key)}
                        className={cn(
                          'rounded-lg border px-3.5 py-3 transition-colors',
                          isRTL ? 'text-right' : 'text-left',
                          active
                            ? 'border-emerald-300 bg-emerald-50 ring-1 ring-inset ring-emerald-200'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <span className="block text-sm font-semibold">{getAreaLabel(option.key)}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {isRTL
                            ? option.key === 'CR'
                              ? 'إنشاء شركة ذات مسؤولية محدودة في السعودية'
                              : 'للمستثمرين والمواهب والرياديين وغيرهم'
                            : option.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className={cn("px-5 py-3 border-t bg-muted/20 gap-2 sm:gap-2", isRTL ? "sm:flex-row-reverse" : "sm:flex-row")}>
          {step === 'type' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('client')
                setSelectedArea(null)
              }}
              disabled={starting}
              className="cursor-pointer"
            >
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-1.5 rotate-180" : "mr-1.5")} />
              {t('admin.wizards.modal.back')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={starting} className="cursor-pointer">
            {t('admin.wizards.dialog.cancel')}
          </Button>
          {step === 'client' ? (
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
              disabled={!selectedClient}
              onClick={() => setStep('type')}
            >
              {t('admin.wizards.modal.next')}
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
              disabled={!selectedArea || starting}
              onClick={() => void handleStart()}
            >
              {starting ? (
                <>
                  <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-1.5" : "mr-1.5")} />
                  {t('admin.wizards.modal.creating')}
                </>
              ) : (
                isRTL ? 'بدء الطلب' : 'Start application'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
