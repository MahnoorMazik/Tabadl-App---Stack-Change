// import type { Session } from "next-auth";
// import { hasPermission } from "@/lib/rbac";

// /**
//  * Who may add or remove attachments on a ticket:
//  * - `support.manage` (update/edit), or
//  * - the ticket author who has `support.view` (view/add).
//  */
// export async function canMutateSupportAttachments(
//   session: Session | null,
//   ticket: { createdById: number }
// ): Promise<boolean> {
//   if (!session?.user) return false;
//   if (session.user.isAdmin) return true;
//   const userId = parseInt(session.user.id, 10);
//   if (Number.isNaN(userId)) return false;
//   if (await hasPermission(userId, "support.manage")) return true;
//   if (await hasPermission(userId, "support.view") && ticket.createdById === userId) {
//     return true;
//   }
//   return false;
// }

import type { Session } from "next-auth";
import { hasPermission } from "@/lib/rbac";

/**
 * Who may add or remove attachments on a ticket:
 * - `support.manage` (update/edit), or
 * - the ticket author who has `support.view` (view/add).
 */
export async function canMutateSupportAttachments(
  session: Session | null,
  ticket: { createdById: string }
): Promise<boolean> {
  if (!session?.user) return false;

  const userId = session.user.id;

  if (!userId) return false;

  if (await hasPermission(userId, "support.manage")) {
    return true;
  }

  if (
    (await hasPermission(userId, "support.view")) &&
    ticket.createdById === userId
  ) {
    return true;
  }

  return false;
}