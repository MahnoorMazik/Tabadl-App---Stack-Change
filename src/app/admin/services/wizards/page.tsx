'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Layers,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Module, Action } from '@/lib/rbac'
import { useToast } from '@/hooks/use-toast'
import { CreateWizardModal } from '@/components/admin/wizards/CreateWizardModal'
import { WizardPreviewModal } from '@/components/admin/wizards/WizardPreviewModal'
import { AreaOfInterestKey, AREA_OF_INTEREST_OPTIONS } from '@/components/admin/forms/types'
import { getLocalizedText } from '@/lib/multilingual-text'
import { WizardListItem, mapApiWizard } from '@/components/admin/wizards/types'
import { wizardApi, WizardApiError } from '@/components/admin/wizards/api'
import { useLocale } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

export default function WizardsPage() {
  const { toast } = useToast()
  const { t, locale } = useLocale()
  const isRTL = locale === 'ar'
  const [wizards, setWizards] = useState<WizardListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWizard, setEditingWizard] = useState<WizardListItem | null>(null)
  const [previewWizard, setPreviewWizard] = useState<WizardListItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WizardListItem | null>(null)
  const [activateTarget, setActivateTarget] = useState<{
    wizard: WizardListItem
    replaces: WizardListItem
  } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Search & pagination state
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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

  function formatDate(value: string) {
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return value
    }
  }

  const loadWizards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await wizardApi.list()
      setWizards((res.wizards ?? []).map(mapApiWizard))
    } catch (error) {
      toast({
        title: 'Failed to load wizards',
        description:
          error instanceof WizardApiError
            ? error.message
            : 'Please refresh and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadWizards()
  }, [loadWizards])

  // Reset page to 1 whenever search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  const openCreate = () => {
    setEditingWizard(null)
    setModalOpen(true)
  }

  const openEdit = (wizard: WizardListItem) => {
    setEditingWizard(wizard)
    setModalOpen(true)
  }

  const openPreview = (wizard: WizardListItem) => {
    setPreviewWizard(wizard)
    setPreviewOpen(true)
  }

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open)
    if (!open) setEditingWizard(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await wizardApi.delete(deleteTarget.id)
      setWizards((prev) => prev.filter((w) => w.id !== deleteTarget.id))
      toast({
        title: t('admin.wizards.toast.deleted'),
        description: `${deleteTarget.name} ${t('admin.wizards.toast.deletedDesc')}`,
      })
      setDeleteTarget(null)
    } catch (error) {
      toast({
        title: t('admin.wizards.toast.deleteFailed'),
        description:
          error instanceof WizardApiError
            ? error.message
            : t('admin.wizards.toast.couldNotDelete'),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const applyActiveChange = async (wizard: WizardListItem, isActive: boolean) => {
    setTogglingId(wizard.id)
    try {
      await wizardApi.update(wizard.id, { isActive })
      await loadWizards()
      toast({
        title: isActive ? t('admin.wizards.toast.activated') : t('admin.wizards.toast.deactivated'),
        description: isActive
          ? `${wizard.name} ${t('admin.wizards.toast.activatedDesc')} ${getAreaLabel(wizard.areaOfInterest)}. ${t('admin.wizards.toast.othersDeactivated')} ${wizard.areaOfInterest} ${t('admin.wizards.toast.othersDeactivated') === t('admin.wizards.toast.othersDeactivated') ? 'wizards' : 'مماميس'} تم تعطيلها.`
          : `${wizard.name} ${t('admin.wizards.toast.deactivatedDesc')}`,
      })
    } catch (error) {
      toast({
        title: t('admin.wizards.toast.updateFailed'),
        description:
          error instanceof WizardApiError ? error.message : t('admin.wizards.toast.couldNotUpdate'),
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
      setActivateTarget(null)
    }
  }

  const requestActiveChange = (wizard: WizardListItem, isActive: boolean) => {
    if (!isActive) {
      void applyActiveChange(wizard, false)
      return
    }

    const otherActive = wizards.find(
      (w) =>
        w.id !== wizard.id &&
        w.isActive === true &&
        w.areaOfInterest === wizard.areaOfInterest
    )

    if (otherActive) {
      setActivateTarget({ wizard, replaces: otherActive })
      return
    }

    void applyActiveChange(wizard, true)
  }

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return wizards
    return wizards.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.areaOfInterest?.toLowerCase().includes(q)
    )
  }, [wizards, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <AdminPageTemplate
      title={t('admin.wizards.title')}
      description=""
      icon={<Layers className="h-5 w-5 text-emerald-600" />}
      showConstruction={false}
      requiredPermission={`${Module.SERVICES}.${Action.VIEW}`}
      actions={
        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
          onClick={openCreate}
        >
          <Plus className={cn('h-4 w-4', isRTL ? 'ml-1' : 'mr-1')} />
          {t('admin.wizards.createButton')}
        </Button>
      }
    >
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardHeader>
            <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3', isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row')}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle>{t('admin.wizards.heading')}</CardTitle>
                <CardDescription className={cn('mt-0.5', isRTL ? 'text-right' : 'text-left')}>
                  {loading
                    ? t('admin.wizards.loading')
                    : filtered.length === 0
                      ? search
                        ? t('admin.wizards.noResults')
                        : t('admin.wizards.noWizards')
                      : `${filtered.length} ${filtered.length === 1 ? (isRTL ? 'معالج' : 'wizard') : (isRTL ? 'معالجات' : 'wizards')}. ${t('admin.wizards.description')}`}
                </CardDescription>
              </div>
              {/* Search */}
              <div className="relative sm:w-64">
                <Search className={cn('absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none', isRTL ? 'right-2.5' : 'left-2.5')} />
                <Input
                  placeholder={t('admin.wizards.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn('h-9 text-sm', isRTL ? 'pr-8 text-right' : 'pl-8 text-left')}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : wizards.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {t('admin.wizards.createFirst')}
                </p>
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={openCreate}
                >
                  <Plus className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                  {t('admin.wizards.createStepsButton')}
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className={cn('rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground', isRTL ? 'text-right' : 'text-left')}>
                {t('admin.wizards.noMatch')}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.wizards.table.name')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.wizards.table.service')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.wizards.table.steps')}</TableHead>
                      <TableHead className={cn('w-30', isRTL ? 'text-right' : 'text-left')}>{t('admin.wizards.table.status')}</TableHead>
                      <TableHead className={cn('w-24', isRTL ? 'text-right' : 'text-left')}>{t('admin.wizards.table.created')}</TableHead>
                      <TableHead className={cn('w-36', isRTL ? 'text-left' : 'text-right')}>{t('admin.wizards.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((wizard) => {
                      const isLive = wizard.isActive === true
                      const busy = togglingId === wizard.id
                      return (
                      <TableRow key={wizard.id} className="hover:bg-muted/30">
                        <TableCell className={cn("font-medium max-w-48", isRTL ? 'text-right' : 'text-left')}>
                          <div className={cn('flex gap-2 min-w-0 items-center', isRTL ? 'flex-row-reverse justify-end' : 'flex-row')}>
                            <span className="truncate block">{getLocalizedText(wizard.name, locale)}</span>
                            {isLive && (
                              <Badge className="w-fit text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shrink-0">
                                {t('admin.wizards.live')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          <span className="text-sm">
                            {wizard.areaOfInterest} · {getAreaLabel(wizard.areaOfInterest)}
                          </span>
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          <span className="text-sm">
                            {wizard.steps.length} {wizard.steps.length === 1 ? t('admin.wizards.stepSingular') : t('admin.wizards.stepPlural')}
                          </span>
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          <div className={cn('flex items-center gap-2 border-0', isRTL ? 'flex-row-reverse justify-start' : 'flex-row')}>
                            <Switch
                              id={`wizard-active-${wizard.id}`}
                              checked={isLive}
                              disabled={busy}
                              dir="ltr"
                              onCheckedChange={(checked) => requestActiveChange(wizard, checked)}
                              aria-label={`${isLive ? t('admin.wizards.inactive') : t('admin.wizards.active')} ${wizard.name}`}
                            />
                            <Label
                              htmlFor={`wizard-active-${wizard.id}`}
                              className="text-xs text-muted-foreground cursor-pointer shrink-0"
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isLive ? (
                                t('admin.wizards.active')
                              ) : (
                                t('admin.wizards.inactive')
                              )}
                            </Label>
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-xs text-muted-foreground", isRTL ? 'text-right' : 'text-left')}>
                          {formatDate(wizard.createdAt)}
                        </TableCell>
                        <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                          <div className={cn('flex items-center gap-1', isRTL ? 'justify-start' : 'justify-end')}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 border cursor-pointer"
                              onClick={() => openEdit(wizard)}
                              aria-label={t('admin.wizards.editLabel')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 border text-muted-foreground hover:text-destructive cursor-pointer"
                              onClick={() => setDeleteTarget(wizard)}
                              aria-label={t('admin.wizards.deleteLabel')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Pagination — only show when more than PAGE_SIZE records */}
                {filtered.length > PAGE_SIZE && (
                  <div className={cn('flex items-center justify-between border-t pt-4 mt-2', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.wizards.pageOf').replace('{page}', String(safePage)).replace('{totalPages}', String(totalPages))} — {filtered.length} {filtered.length === 1 ? t('admin.wizards.recordSingular') : t('admin.wizards.recordPlural')}
                    </p>
                    <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        aria-label={t('admin.wizards.previousPage')}
                      >
                        {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={p}
                          type="button"
                          variant={p === safePage ? 'default' : 'outline'}
                          size="icon"
                          className={`h-8 w-8 text-xs cursor-pointer ${p === safePage ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-700' : ''}`}
                          onClick={() => setPage(p)}
                          aria-label={t('admin.wizards.pageLabel').replace('{page}', String(p))}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        aria-label={t('admin.wizards.nextPage')}
                      >
                        {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateWizardModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        editingWizard={editingWizard}
        onCreated={() => {
          setPage(1)
          void loadWizards()
        }}
        onUpdated={() => {
          void loadWizards()
        }}
      />

      <WizardPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        wizard={previewWizard}
      />

      <AlertDialog
        open={Boolean(activateTarget)}
        onOpenChange={(open) => {
          if (!open && !togglingId) setActivateTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.wizards.dialog.switchTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.wizards.dialog.switchDesc')}{' '}
              <span className="font-medium">
                {getLocalizedText(activateTarget?.wizard.name, locale)} ({activateTarget?.wizard.areaOfInterest})
              </span>{' '}
              {t('admin.wizards.dialog.willDeactivate')}{' '}
              <span className="font-medium">
                {getLocalizedText(activateTarget?.replaces.name, locale)} ({activateTarget?.replaces.areaOfInterest})
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(togglingId)}>{t('admin.wizards.dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={(e) => {
                e.preventDefault()
                if (activateTarget) void applyActiveChange(activateTarget.wizard, true)
              }}
              disabled={Boolean(togglingId)}
            >
              {togglingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.wizards.dialog.activating')}
                </>
              ) : (
                t('admin.wizards.dialog.activate')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.wizards.dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.wizards.dialog.deleteDesc')} <span className="font-medium">{deleteTarget?.name}</span>
              {deleteTarget
                ? ` (${deleteTarget.areaOfInterest}, ${deleteTarget.steps.length} ${deleteTarget.steps.length === 1 ? t('admin.wizards.stepSingular') : t('admin.wizards.stepPlural')})`
                : ''}
              . {t('admin.wizards.dialog.cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('admin.wizards.dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.wizards.dialog.deleting')}
                </>
              ) : (
                t('admin.wizards.dialog.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  </AdminPageTemplate>
  )
}
