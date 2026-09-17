import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { authorizeAny } from "@/lib/rbac";
import { 
  SUPPORT_ACCESS_PERMISSIONS, 
  SUPPORT_UPDATE_EDIT 
} from "@/lib/support/permissions";
import { resolveSupportTicketIdParam } from "@/lib/prefixedRef";
import { getSupportUploadDir } from "@/lib/support/supportAttachmentStorage";
import fs from 'fs';
import path from 'path';

// GET - Download a specific attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const numId = await resolveSupportTicketIdParam(db, id);
    if (numId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use SUPPORT_ACCESS_PERMISSIONS for viewing
    const authResult = await authorizeAny([...SUPPORT_ACCESS_PERMISSIONS]);
    if (!authResult.authorized) return authResult.response!;

    const attachment = await db.supportTicketAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        ticketId: numId,
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const uploadDir = getSupportUploadDir();
    const fileName = path.basename(attachment.filePath);
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        'Content-Length': String(attachment.fileSize),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const numId = await resolveSupportTicketIdParam(db, id);
    if (numId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use SUPPORT_UPDATE_EDIT for deleting attachments
    const authResult = await authorizeAny([SUPPORT_UPDATE_EDIT]);
    if (!authResult.authorized) return authResult.response!;

    const attachment = await db.supportTicketAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        ticketId: numId,
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    try {
      const uploadDir = getSupportUploadDir();
      const fileName = path.basename(attachment.filePath);
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Error deleting file from filesystem:", error);
    }

    await db.supportTicketAttachment.delete({
      where: { id: attachment.id },
    });

    return NextResponse.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}