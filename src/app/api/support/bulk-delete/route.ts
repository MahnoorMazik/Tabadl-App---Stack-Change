import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/rbac";
import { SUPPORT_UPDATE_EDIT } from "@/lib/support/permissions";
import { unlinkSupportAttachment } from "@/lib/support/supportAttachmentStorage";

type Body = { ids?: unknown };

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
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }

    const ids = rawIds
      .map((x) => (typeof x === "number" ? x : parseInt(String(x), 10)))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid ticket ids" }, { status: 400 });
    }

    // Fetch all tickets to delete (including attachments for cleanup)
    const tickets = await prisma.supportTicket.findMany({
      where: { id: { in: ids } },
      include: { attachments: true },
    });
    if (tickets.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete attachment files from disk
    for (const ticket of tickets) {
      for (const attachment of ticket.attachments) {
        await unlinkSupportAttachment(attachment.filePath);
      }
    }

    // Delete all tickets
    let deletedCount = 0;
    for (const ticket of tickets) {
      await prisma.supportTicket.delete({ where: { id: ticket.id } });
      deletedCount += 1;
    }

    return NextResponse.json({ deleted: deletedCount, requested: tickets.length });
  } catch (e) {
    console.error("Support bulk delete error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
