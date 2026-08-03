// import { prisma } from "@/lib/db";

import { dispatchEvent } from "@/lib/notifications/service";
import { getPrefixedEntityPrefix } from "@/lib/prefixedRef";
import { formatDisplayId } from "@/lib/displayId";

import { SUPPORT_STATUS_LABEL } from "@/lib/support/supportStatus";
import { Prisma  } from "@prisma/client";

const STATUS_TO_EVENT: Partial<Record<SupportTicketStatus, string>> = {
  IN_PROGRESS: "SUPPORT_TICKET_IN_PROGRESS",
  RESOLVED: "SUPPORT_TICKET_RESOLVED",
  CLOSED: "SUPPORT_TICKET_CLOSED",
};

/**
 * Dispatches in-app/push/email notifications for support ticket status changes.
 * Channels and recipients are governed by NotificationSetting for the relevant event type.
 */
export async function notifySupportTicketStatusChange(params: {
  ticketId: number;
  // previousStatus: SupportTicketStatus;
  // newStatus: SupportTicketStatus;
}): Promise<void> {
  if (params.previousStatus === params.newStatus) return;

  // const [ticket, prefix] = await Promise.all([
  //   Prisma.supportTicket.findUnique({
  //     where: { id: params.ticketId },
  //     include: {
  //       createdBy: { select: { id: true, email: true, name: true, firstName: true, lastName: true } },
  //     },
  //   }),
  //   getPrefixedEntityPrefix(Prisma, "supportTicket"),
  // ]);

  if (!ticket) return;

  const displayId = formatDisplayId(ticket.id, prefix);

  const title = `Support Ticket ${SUPPORT_STATUS_LABEL[params.newStatus]}`;
  const message = `Ticket ${displayId} — "${ticket.title}" — status changed to ${SUPPORT_STATUS_LABEL[params.newStatus]}.`;

  // Dispatch through notification system (respects NotificationSetting channels + recipients)
  try {
    await dispatchEvent({
      eventType,
      title,
      message,
      entityType: "SupportTicket",
      entityId: String(ticket.id),
      url: `/admin/support?ticket=${ticket.id}`,
    });
  } catch {
    // best-effort
  }
}
