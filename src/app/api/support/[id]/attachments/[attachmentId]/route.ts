import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveSupportTicketIdParam } from "@/lib/prefixedRef";
import { canMutateSupportAttachments } from "@/lib/support/supportAttachmentAccess";
import { canViewSupportTicket, supportTicketNotFoundResponse } from "@/lib/support/permissions";
import { unlinkSupportAttachment } from "@/lib/support/supportAttachmentStorage";
import { auth } from "@/lib/auth/config";


export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const numTicketId = await resolveSupportTicketIdParam(db, id);
    if (numTicketId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const attId = parseInt(attachmentId, 10);
    if (Number.isNaN(attId)) {
      return NextResponse.json({ error: "Invalid attachment id" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await db.supportTicket.findUnique({
      where: { id: numTicketId },
      select: { id: true, createdById: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    if (!(await canViewSupportTicket(session, ticket.createdById))) {
      return supportTicketNotFoundResponse();
    }

    if (!(await canMutateSupportAttachments(session, ticket))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attachment = await db.supportTicketAttachment.findFirst({
      where: { id: attId, ticketId: numTicketId },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    await db.supportTicketAttachment.delete({
      where: { id: attId },
    });

    await unlinkSupportAttachment(attachment.filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Support ticket attachment DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
