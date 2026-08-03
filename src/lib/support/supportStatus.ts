import type { SupportTicketStatus } from "@prisma/client";

/** Product limit: four workflow states only. */
export const SUPPORT_TICKET_STATUSES: readonly SupportTicketStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function isValidSupportStatus(s: string): s is SupportTicketStatus {
  return (SUPPORT_TICKET_STATUSES as readonly string[]).includes(s);
}
