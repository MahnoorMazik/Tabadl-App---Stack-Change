import { db } from '@/lib/db'

export type ClientNotificationFlags = {
  emailEnabled: boolean
  whatsappEnabled: boolean
}

const DEFAULTS: ClientNotificationFlags = {
  emailEnabled: true,
  whatsappEnabled: true,
}

/** Latest general settings row, or defaults when none saved yet. */
export async function getGeneralSettings() {
  const row = await db.generalSettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  return {
    id: row?.id ?? null,
    clientEmailNotifications: row?.clientEmailNotifications ?? DEFAULTS.emailEnabled,
    clientWhatsAppNotifications: row?.clientWhatsAppNotifications ?? DEFAULTS.whatsappEnabled,
    updatedAt: row?.updatedAt ?? null,
  }
}

export async function getClientNotificationFlags(): Promise<ClientNotificationFlags> {
  const settings = await getGeneralSettings()
  return {
    emailEnabled: settings.clientEmailNotifications,
    whatsappEnabled: settings.clientWhatsAppNotifications,
  }
}

export async function saveGeneralSettings(data: {
  clientEmailNotifications?: boolean
  clientWhatsAppNotifications?: boolean
}) {
  const existing = await db.generalSettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (existing) {
    return db.generalSettings.update({
      where: { id: existing.id },
      data: {
        ...(typeof data.clientEmailNotifications === 'boolean' && {
          clientEmailNotifications: data.clientEmailNotifications,
        }),
        ...(typeof data.clientWhatsAppNotifications === 'boolean' && {
          clientWhatsAppNotifications: data.clientWhatsAppNotifications,
        }),
      },
    })
  }

  return db.generalSettings.create({
    data: {
      clientEmailNotifications:
        data.clientEmailNotifications ?? DEFAULTS.emailEnabled,
      clientWhatsAppNotifications:
        data.clientWhatsAppNotifications ?? DEFAULTS.whatsappEnabled,
    },
  })
}
