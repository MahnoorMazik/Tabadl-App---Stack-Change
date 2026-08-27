// import { NextRequest, NextResponse } from "next/server";
// // import { prisma } from "@/lib/db";
// // import { auth } from "@/lib/auth";
// import { SUPPORT_ACCESS_PERMISSIONS, canViewSupportTicket, supportTicketNotFoundResponse } from "@/lib/support/permissions";
// import { writeFile } from "fs/promises";
// import { join } from "path";
// import { randomUUID } from "crypto";
// import { resolveSupportTicketIdParam } from "@/lib/prefixedRef";
// import { canMutateSupportAttachments } from "@/lib/support/supportAttachmentAccess";
// import { documentMimeMatchesDeclared } from "@/lib/file-validation";
// import {
//   ensureSupportUploadDir,
//   filenameFromStoredPath,
//   getSupportUploadDir,
//   supportDownloadUrl,
//   supportStorageRelativePath,
// } from "@/lib/support/supportAttachmentStorage";
// import { auth } from "@/lib/auth/config";
// import { authorizeAny } from "@/lib/rbac";
// import { db } from "@/lib/db";
// const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
// const MAX_ATTACHMENTS = 10;

// function cleanFileName(name: string): string {
//   return name.replace(/[^a-zA-Z0-9.-]/g, "_");
// }

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const numId = await resolveSupportTicketIdParam(db, id);
//     if (numId == null) {
//       return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
//     }

//     const session = await auth();
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     const authResult = await authorizeAny([...SUPPORT_ACCESS_PERMISSIONS]);
//     if (!authResult.authorized) return authResult.response!;

//     const ticket = await db.supportTicket.findUnique({
//       where: { id: numId },
//       select: { id: true, createdById: true },
//     });

//     if (!ticket) {
//       return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
//     }

//     if (!(await canViewSupportTicket(session, ticket.createdById))) {
//       return supportTicketNotFoundResponse();
//     }

//     const attachments = await db.supportTicketAttachment.findMany({
//       where: { ticketId: numId },
//       orderBy: { createdAt: "desc" },
//     });

//     const attachmentsWithUrl = attachments.map((att) => ({
//       id: att.id,
//       fileName: att.fileName,
//       fileType: att.fileType,
//       fileSize: att.fileSize,
//       url: supportDownloadUrl(filenameFromStoredPath(att.filePath) ?? ""),
//       uploadedAt: att.createdAt.toISOString(),
//     }));

//     return NextResponse.json({ attachments: attachmentsWithUrl });
//   } catch (error) {
//     console.error("Support ticket attachments GET error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// export async function POST(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const numId = await resolveSupportTicketIdParam(db, id);
//     if (numId == null) {
//       return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
//     }

//     const session = await auth();
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     const ticket = await db.supportTicket.findUnique({
//       where: { id: numId },
//       select: { id: true, createdById: true },
//     });

//     if (!ticket) {
//       return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
//     }

//     if (!(await canViewSupportTicket(session, ticket.createdById))) {
//       return supportTicketNotFoundResponse();
//     }

//     if (!(await canMutateSupportAttachments(session, ticket))) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     const formData = await request.formData();
//     const files = formData.getAll("files") as File[];

//     if (!files || files.length === 0) {
//       return NextResponse.json({ error: "No files provided" }, { status: 400 });
//     }

//     // Check current attachment count
//     const currentCount = await db.supportTicketAttachment.count({
//       where: { ticketId: numId },
//     });

//     if (currentCount + files.length > MAX_ATTACHMENTS) {
//       return NextResponse.json(
//         { error: `Exceeds maximum ${MAX_ATTACHMENTS} attachments per ticket` },
//         { status: 400 }
//       );
//     }

//     await ensureSupportUploadDir();
//     const uploadDir = getSupportUploadDir();

//     const uploadedAttachments: Array<{
//       id: number;
//       fileName: string;
//       fileType: string;
//       fileSize: number;
//       url: string;
//     }> = [];

//     for (const file of files) {
//       if (file.size > MAX_FILE_SIZE) {
//         return NextResponse.json(
//           { error: `File ${file.name} exceeds 10MB limit` },
//           { status: 400 }
//         );
//       }

//       if (!ALLOWED_TYPES.includes(file.type)) {
//         return NextResponse.json(
//           { error: `File type ${file.type} not allowed. Allowed: PDF, JPEG, JPG, PNG` },
//           { status: 400 }
//         );
//       }

//       const bytes = await file.arrayBuffer();
//       const buffer = Buffer.from(bytes);
//       const declaredMime = file.type === "image/jpg" ? "image/jpeg" : file.type;
//       if (!documentMimeMatchesDeclared(buffer, declaredMime)) {
//         return NextResponse.json(
//           { error: "File content does not match its declared type." },
//           { status: 400 }
//         );
//       }

//       const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
//       const safeFileName = `${randomUUID()}-${cleanFileName(file.name)}`;
//       const filePath = join(uploadDir, safeFileName);
//       const relativePath = supportStorageRelativePath(safeFileName);

//       await writeFile(filePath, buffer);

//       const attachment = await db.supportTicketAttachment.create({
//         data: {
//           ticketId: numId,
//           fileName: file.name,
//           filePath: relativePath,
//           fileSize: file.size,
//           fileType: file.type,
//         },
//       });

//       uploadedAttachments.push({
//         id: attachment.id,
//         fileName: attachment.fileName,
//         fileType: attachment.fileType,
//         fileSize: attachment.fileSize,
//         url: supportDownloadUrl(safeFileName),
//       });
//     }

//     return NextResponse.json({ uploaded: uploadedAttachments }, { status: 201 });
//   } catch (error) {
//     console.error("Support ticket attachments POST error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { authorizeAny } from "@/lib/rbac";
import { resolveSupportTicketIdParam } from "@/lib/prefixedRef";
import { 
  SUPPORT_ACCESS_PERMISSIONS, 
  SUPPORT_UPDATE_EDIT 
} from "@/lib/support/permissions";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import {
  ensureSupportUploadDir,
  getSupportUploadDir,
  supportStorageRelativePath,
  supportDownloadUrl,
} from "@/lib/support/supportAttachmentStorage";
import { documentMimeMatchesDeclared } from "@/lib/file-validation";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_ATTACHMENTS = 10;

function cleanFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

// GET - Fetch attachments for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = await resolveSupportTicketIdParam(db, id);
    if (numId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use SUPPORT_ACCESS_PERMISSIONS for viewing attachments
    const authResult = await authorizeAny([...SUPPORT_ACCESS_PERMISSIONS]);
    if (!authResult.authorized) return authResult.response!;

    const ticket = await db.supportTicket.findUnique({
      where: { id: numId },
      select: { id: true, createdById: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const attachments = await db.supportTicketAttachment.findMany({
      where: { ticketId: numId },
      orderBy: { createdAt: "desc" },
    });

    const attachmentsWithUrl = attachments.map((att) => ({
      id: att.id,
      fileName: att.fileName,
      fileType: att.fileType,
      fileSize: att.fileSize,
      url: supportDownloadUrl(att.filePath.split('/').pop() || ''),
      uploadedAt: att.createdAt.toISOString(),
    }));

    return NextResponse.json({ attachments: attachmentsWithUrl });
  } catch (error) {
    console.error("Support ticket attachments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Upload attachments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = await resolveSupportTicketIdParam(db, id);
    if (numId == null) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use SUPPORT_UPDATE_EDIT for uploading attachments
    const authResult = await authorizeAny([SUPPORT_UPDATE_EDIT]);
    if (!authResult.authorized) return authResult.response!;

    const ticket = await db.supportTicket.findUnique({
      where: { id: numId },
      select: { id: true, createdById: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const currentCount = await db.supportTicketAttachment.count({
      where: { ticketId: numId },
    });

    if (currentCount + files.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `Exceeds maximum ${MAX_ATTACHMENTS} attachments per ticket` },
        { status: 400 }
      );
    }

    await ensureSupportUploadDir();
    const uploadDir = getSupportUploadDir();

    const uploadedAttachments: Array<{
      id: number;
      fileName: string;
      fileType: string;
      fileSize: number;
      url: string;
    }> = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }

      // Normalize file type
      let fileType = file.type;
      if (fileType === "image/jpg") {
        fileType = "image/jpeg";
      }

      if (!ALLOWED_TYPES.includes(fileType) && !ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed. Allowed: PDF, JPEG, JPG, PNG` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const declaredMime = file.type === "image/jpg" ? "image/jpeg" : file.type;
      
      if (!documentMimeMatchesDeclared(buffer, declaredMime)) {
        return NextResponse.json(
          { error: "File content does not match its declared type." },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const safeFileName = `${randomUUID()}-${cleanFileName(file.name)}`;
      const filePath = join(uploadDir, safeFileName);
      const relativePath = supportStorageRelativePath(safeFileName);

      await writeFile(filePath, buffer);

      const attachment = await db.supportTicketAttachment.create({
        data: {
          ticketId: numId,
          fileName: file.name,
          filePath: relativePath,
          fileSize: file.size,
          fileType: fileType,
        },
      });

      uploadedAttachments.push({
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        url: supportDownloadUrl(safeFileName),
      });
    }

    return NextResponse.json({ uploaded: uploadedAttachments }, { status: 201 });
  } catch (error) {
    console.error("Support ticket attachments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}