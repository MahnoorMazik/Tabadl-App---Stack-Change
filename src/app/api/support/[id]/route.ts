import { NextRequest, NextResponse } from "next/server";

// import { authorize, authorizeAny } from "@/lib/rbac";

import {
  SUPPORT_ACCESS_PERMISSIONS,
  SUPPORT_UPDATE_EDIT,
  canViewSupportTicket,
  supportTicketNotFoundResponse,
} from "@/lib/support/permissions";
import { Prisma, type SupportTicketStatus as SupportTicketStatusType } from "@prisma/client";
import { getPrefixedEntityPrefix, resolveSupportTicketIdParam, withSupportDisplayIdField } from "@/lib/prefixedRef";
import { isValidSupportStatus } from "@/lib/support/supportStatus";
import { notifySupportTicketStatusChange } from "@/lib/support/notifySupportTicketEmails";
import { unlinkSupportAttachment } from "@/lib/support/supportAttachmentStorage";
import { auth } from "@/lib/auth/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resolvedId = await resolveSupportTicketIdParam(prisma, id);
    if (resolvedId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authViewResult = await authorizeAny(session, [...SUPPORT_ACCESS_PERMISSIONS]);
    if (!authViewResult.authorized) return authViewResult.response!;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: resolvedId },
      include: {
        createdBy: {
          select: { id: true, name: true, firstName: true, lastName: true, email: true },
        },
        attachments: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    if (!(await canViewSupportTicket(session, ticket.createdById))) {
      return supportTicketNotFoundResponse();
    }

    const prefix = await getPrefixedEntityPrefix(prisma, "supportTicket");
    return NextResponse.json(withSupportDisplayIdField(ticket, prefix));
  } catch (error) {
    console.error("Support ticket get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resolvedId = await resolveSupportTicketIdParam(prisma, id);
    if (resolvedId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      title?: string;
      description?: string;
    };

    const newStatus = typeof body.status === "string" ? body.status.trim() : undefined;
    const newTitle = typeof body.title === "string" ? body.title.trim() : undefined;
    const newDescription = typeof body.description === "string" ? body.description : undefined;

    const wantsStatus = newStatus !== undefined;
    const wantsContent = newTitle !== undefined || newDescription !== undefined;

    if (!wantsStatus && !wantsContent) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    if (wantsStatus) {
      const authStatusResult = await authorize(session, SUPPORT_UPDATE_EDIT);
      if (!authStatusResult.authorized) return authStatusResult.response!;
      if (!isValidSupportStatus(newStatus!)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }
    if (wantsContent) {
      const authContentResult = await authorize(session, SUPPORT_UPDATE_EDIT);
      if (!authContentResult.authorized) return authContentResult.response!;
    }

    const existing = await prisma.supportTicket.findUnique({ where: { id: resolvedId } });
    if (!existing) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    if (!(await canViewSupportTicket(session, existing.createdById))) {
      return supportTicketNotFoundResponse();
    }

    const previousStatus = existing.status;

    const data: {
      status?: SupportTicketStatusType;
      title?: string;
      description?: string;
      resolvedAt?: Date | null;
    } = {};

    if (wantsStatus) {
      const st = newStatus as SupportTicketStatusType;
      data.status = st;
      data.resolvedAt = st === "RESOLVED" || st === "CLOSED" ? new Date() : null;
    }
    if (newTitle !== undefined) data.title = newTitle;
    if (newDescription !== undefined) data.description = newDescription.trim();

    const ticket = await prisma.supportTicket.update({
      where: { id: resolvedId },
      data,
      include: {
        createdBy: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
        attachments: true,
      },
    });

    if (wantsStatus) {
      const st = newStatus as SupportTicketStatusType;
      if (st !== previousStatus) {
        await notifySupportTicketStatusChange({
          ticketId: resolvedId,
          previousStatus,
          newStatus: st,
        });
      }
    }

    const p = await getPrefixedEntityPrefix(prisma, "supportTicket");
    return NextResponse.json(withSupportDisplayIdField(ticket, p));
  } catch (error) {
    console.error("Support ticket update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resolvedId = await resolveSupportTicketIdParam(prisma, id);
    if (resolvedId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authDelResult = await authorize(session, SUPPORT_UPDATE_EDIT);
    if (!authDelResult.authorized) return authDelResult.response!;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: resolvedId },
      include: { attachments: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    for (const a of ticket.attachments) {
      await unlinkSupportAttachment(a.filePath);
    }

    await prisma.supportTicket.delete({ where: { id: resolvedId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Support ticket delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
