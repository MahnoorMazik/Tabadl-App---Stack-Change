import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/rbac";

/** View support tickets and create new tickets. */
export const SUPPORT_VIEW_ADD = "support.view";

/** Update ticket content/status and other manage actions (admin delete, bulk ops). */
export const SUPPORT_UPDATE_EDIT = "support.manage";

/** Either permission grants access to the Support module and list/detail read APIs. */
export const SUPPORT_ACCESS_PERMISSIONS = [
  SUPPORT_VIEW_ADD,
  SUPPORT_UPDATE_EDIT,
] as const;

/** Users with support.manage (or admin) see all tickets */
export async function canManageAllSupportTickets(
  session: Session
): Promise<boolean> {
  const userId = session.user.id;

  if (!userId) return false;

  return hasPermission(userId, SUPPORT_UPDATE_EDIT);
}

/** For list queries: restrict non-managers to tickets they created. */
export async function getSupportListCreatedByFilter(
  session: Session
): Promise<string | undefined> {
  if (await canManageAllSupportTickets(session)) return undefined;

  return session.user.id ?? undefined;
}

export function supportTicketNotFoundResponse(): NextResponse {
  return NextResponse.json(
    { error: "Support ticket not found" },
    { status: 404 }
  );
}

/** Returns false if the user cannot view this ticket */
export async function canViewSupportTicket(
  session: Session,
  ticketCreatedById: string | null
): Promise<boolean> {
  if (await canManageAllSupportTickets(session)) return true;

  const userId = session.user.id;

  if (!userId) return false;

  return ticketCreatedById === userId;
}