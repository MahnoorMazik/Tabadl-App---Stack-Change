import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/rbac";
import { SUPPORT_UPDATE_EDIT } from "@/lib/support/permissions";
import { isValidSupportStatus } from "@/lib/support/supportStatus";
import type { SupportTicketStatus } from "@prisma/client";
import { notifySupportTicketStatusChange } from "@/lib/support/notifySupportTicketEmails";

type Body = { ids?: unknown; status?: unknown };

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authResult = await authorize(session, SUPPORT_UPDATE_EDIT);
    if (!authResult.authorized) return authResult.response!;

    const body = (await request.json().catch(() => ({}))) as Body;
    const rawIds = body.ids;
    const status = typeof body.status === "string" ? body.status.trim() : "";
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }
    if (!isValidSupportStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const ids = rawIds
      .map((x) => (typeof x === "number" ? x : parseInt(String(x), 10)))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid ticket ids" }, { status: 400 });
    }

    const newStatus = status as SupportTicketStatus;
    const nowResolved = newStatus === "RESOLVED" || newStatus === "CLOSED";
    const tickets = await prisma.supportTicket.findMany({ where: { id: { in: ids } } });
    if (tickets.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    let count = 0;
    for (const t of tickets) {
      if (t.status === newStatus) continue;
      const prev = t.status;
      await prisma.supportTicket.update({
        where: { id: t.id },
        data: {
          status: newStatus,
          resolvedAt: nowResolved ? new Date() : null,
        },
      });
      count += 1;
      notifySupportTicketStatusChange({ ticketId: t.id, previousStatus: prev, newStatus }).catch((e) => console.error("[support bulk-status] notify failed:", e));
    }

    return NextResponse.json({ updated: count, requested: tickets.length });
  } catch (e) {
    console.error("Support bulk status error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
