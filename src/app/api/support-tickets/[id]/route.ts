

// app/api/support-tickets/[id]/route.ts


import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import {
  ensureSupportUploadDir,
  getSupportUploadDir,
  supportStorageRelativePath,
} from "@/lib/support/supportAttachmentStorage";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { authorizeAny } from "@/lib/rbac";
import { 
  SUPPORT_ACCESS_PERMISSIONS, 
  SUPPORT_UPDATE_EDIT 
} from "@/lib/support/permissions";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

// GET - Fetch single ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAny([...SUPPORT_ACCESS_PERMISSIONS]);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const ticketId = parseInt(params.id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        attachments: true,
        commentBoxes: {
          include: {
            attachments: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { 
          select: { 
            messages: true,
            attachments: true
          } 
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const response = {
      data: {
        id: String(ticket.id),
        ticketNumber: `TICKET-${String(ticket.id).padStart(6, "0")}`,
        title: ticket.title,
        description: ticket.description,
        comment: ticket.comment || "",
        status: ticket.status.toLowerCase(),
        priority: ticket.priority?.toLowerCase() || "medium",
        category: ticket.category || "",
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        client: ticket.client
          ? {
              id: String(ticket.client.id),
              company: ticket.client.company || "",
              user: {
                id: String(ticket.client.user.id),
                name: ticket.client.user.name,
                email: ticket.client.user.email,
                phone: ticket.client.user.phone,
                avatar: ticket.client.user.avatar,
              },
            }
          : null,
        assignedTo: ticket.assignedTo
          ? {
              id: String(ticket.assignedTo.id),
              name: ticket.assignedTo.name,
              role: ticket.assignedTo.role,
            }
          : null,
        attachments: ticket.attachments || [],
        commentBoxes: ticket.commentBoxes || [],
        messages: ticket.messages || [],
        _count: {
          messages: ticket._count?.messages || 0,
          attachments: ticket._count?.attachments || 0,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAny([SUPPORT_UPDATE_EDIT]);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const contentType = request.headers.get("content-type") || "";
    let body: any = {};
    let commentBoxesData: any[] = [];
    const commentBoxFiles: { [key: string]: File[] } = {};
    let filesToDelete: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      // Extract JSON fields
      const dataJson = formData.get("data");
      if (dataJson && typeof dataJson === "string") {
        try {
          body = JSON.parse(dataJson);
        } catch (e) {
          console.error("Failed to parse data JSON:", e);
        }
      } else {
        // Fallback: extract individual fields
        const title = formData.get("title");
        const description = formData.get("description");
        const comment = formData.get("comment");
        const status = formData.get("status");
        const priority = formData.get("priority");
        const category = formData.get("category");
        const assignedToId = formData.get("assignedToId");
        const parentId = formData.get("parentId"); // ← added
        const filesToDeleteStr = formData.get("filesToDelete");

        if (title && typeof title === "string") body.title = title;
        if (description && typeof description === "string")
          body.description = description;
        if (comment && typeof comment === "string") body.comment = comment;
        if (status && typeof status === "string") body.status = status;
        if (priority && typeof priority === "string") body.priority = priority;
        if (category && typeof category === "string") body.category = category;
        if (assignedToId && typeof assignedToId === "string")
          body.assignedToId = assignedToId;
        if (parentId && typeof parentId === "string") body.parentId = parentId; // ← added

        if (filesToDeleteStr && typeof filesToDeleteStr === "string") {
          try {
            filesToDelete = JSON.parse(filesToDeleteStr);
          } catch (e) {
            console.error("Failed to parse filesToDelete:", e);
          }
        }
      }

      // Get comment boxes data
      const commentBoxesJson = formData.get("commentBoxes");
      if (commentBoxesJson && typeof commentBoxesJson === "string") {
        try {
          const parsed = JSON.parse(commentBoxesJson);
          if (Array.isArray(parsed)) {
            commentBoxesData = parsed;
          }
        } catch (e) {
          console.error("Failed to parse comment boxes:", e);
        }
      }

      // Extract comment box attachments
      formData.forEach((value, key) => {
        if (
          key.startsWith("comment-") &&
          value instanceof File &&
          value.size > 0
        ) {
          const boxId = key.replace("comment-", "");
          if (!commentBoxFiles[boxId]) {
            commentBoxFiles[boxId] = [];
          }
          commentBoxFiles[boxId].push(value);
        }
      });
    } else {
      body = await request.json();
      commentBoxesData = body.commentBoxes || [];
    }

    const statusMap: Record<string, string> = {
      new: "NEW",
      open: "NEW",
      "in-progress": "IN_PROGRESS",
      in_progress: "IN_PROGRESS",
      resolved: "RESOLVED",
      closed: "CLOSED",
    };

    const priorityMap: Record<string, string> = {
      low: "LOW",
      medium: "MEDIUM",
      high: "HIGH",
      urgent: "URGENT",
    };

    const updateData: any = { updatedAt: new Date() };

    if (typeof body.title !== "undefined") updateData.title = body.title;
    if (typeof body.description !== "undefined")
      updateData.description = body.description;
    if (typeof body.comment !== "undefined") updateData.comment = body.comment;

    if (typeof body.status !== "undefined") {
      const dbStatus =
        statusMap[body.status?.toLowerCase()] || body.status?.toUpperCase();
      if (dbStatus) updateData.status = dbStatus;
    }

    if (typeof body.priority !== "undefined") {
      const dbPriority =
        priorityMap[body.priority?.toLowerCase()] ||
        body.priority?.toUpperCase();
      if (dbPriority) updateData.priority = dbPriority;
    }

    if (typeof body.category !== "undefined")
      updateData.category = body.category;

    if (typeof body.assignedToId !== "undefined") {
      updateData.assignedToId = body.assignedToId || null;
    }

    // ===== Parent Ticket support =====
    if (typeof body.parentId !== "undefined") {
      if (
        body.parentId === null ||
        body.parentId === "" ||
        body.parentId === "none"
      ) {
        updateData.parentId = null;
      } else {
        const parsed = parseInt(String(body.parentId), 10);
        // Prevent setting itself as parent
        if (!isNaN(parsed) && parsed !== parseInt(id, 10)) {
          updateData.parentId = parsed;
        }
      }
    }

    if (updateData.status === "RESOLVED") updateData.resolvedAt = new Date();
    if (updateData.status === "CLOSED") updateData.closedAt = new Date();

    const ticketNumber = parseInt(id, 10);

    const updatedTicket = await db.$transaction(async (tx) => {
      // Update ticket
      const ticket = await tx.supportTicket.update({
        where: { id: ticketNumber },
        data: updateData,
      });

      // Delete comment boxes if they were removed
      if (commentBoxesData !== undefined) {
        const existingBoxes = await tx.supportTicketCommentBox.findMany({
          where: { ticketId: ticketNumber },
          select: { id: true },
        });

        const existingBoxIds = existingBoxes.map((b) => b.id);
        const newBoxIds = commentBoxesData
          .filter((b: any) => b.id && typeof b.id === "number")
          .map((b: any) => b.id);

        const boxesToDelete = existingBoxIds.filter(
          (id) => !newBoxIds.includes(id),
        );

        if (boxesToDelete.length > 0) {
          await tx.supportTicketCommentAttachment.deleteMany({
            where: {
              commentBoxId: { in: boxesToDelete },
            },
          });
          await tx.supportTicketCommentBox.deleteMany({
            where: {
              id: { in: boxesToDelete },
            },
          });
        }
      }

      // Process comment boxes
      if (commentBoxesData.length > 0) {
        await ensureSupportUploadDir();
        const uploadDir = getSupportUploadDir();

        function cleanFileName(name: string) {
          return name.replace(/[^a-zA-Z0-9.-]/g, "_");
        }

        for (let i = 0; i < commentBoxesData.length; i++) {
          const boxData = commentBoxesData[i];
          let commentBox;

          if (boxData.id) {
            commentBox = await tx.supportTicketCommentBox.update({
              where: { id: boxData.id },
              data: {
                comment: boxData.comment || "",
                order: i,
              },
            });
          } else {
            commentBox = await tx.supportTicketCommentBox.create({
              data: {
                ticketId: ticketNumber,
                comment: boxData.comment || "",
                order: i,
              },
            });
          }

          const boxId = boxData.tempId || `comment-${Date.now()}-${i}`;
          const boxFiles = commentBoxFiles[boxId] || [];

          if (boxFiles.length > 0) {
            const boxAttachmentData: {
              commentBoxId: number;
              fileName: string;
              filePath: string;
              fileSize: number;
              fileType: string;
            }[] = [];

            for (const file of boxFiles) {
              if (file.size > MAX_FILE_SIZE) {
                throw new Error(
                  `${file.name} exceeds the maximum size of 10MB.`,
                );
              }
              if (!ALLOWED_TYPES.includes(file.type)) {
                throw new Error(
                  `${file.name} is not supported. Only PDF, JPG, JPEG and PNG files are allowed.`,
                );
              }

              const buffer = Buffer.from(await file.arrayBuffer());
              const safeFileName = `${randomUUID()}-${cleanFileName(file.name)}`;
              await writeFile(join(uploadDir, safeFileName), buffer);

              boxAttachmentData.push({
                commentBoxId: commentBox.id,
                fileName: file.name,
                filePath: supportStorageRelativePath(safeFileName),
                fileSize: file.size,
                fileType: file.type,
              });
            }

            if (boxAttachmentData.length > 0) {
              await tx.supportTicketCommentAttachment.createMany({
                data: boxAttachmentData,
              });
            }
          }
        }
      }

      // Delete requested attachments
      if (filesToDelete.length > 0) {
        await tx.supportTicketAttachment.deleteMany({
          where: {
            id: { in: filesToDelete.map((id) => parseInt(id, 10)) },
            ticketId: ticketNumber,
          },
        });
      }

      // Return updated ticket with all relations
      return await tx.supportTicket.findUnique({
        where: { id: ticketNumber },
        include: {
          parent: {
            // ← added
            select: {
              id: true,
              title: true,
            },
          },
          client: {
            include: {
              user: true,
            },
          },
          assignedTo: true,
          attachments: true,
          commentBoxes: {
            include: {
              attachments: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          messages: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              messages: true,
              attachments: true,
            },
          },
        },
      });
    });

    if (!updatedTicket) {
      return NextResponse.json(
        { error: "Ticket not found after update" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(updatedTicket.id),
        ticketNumber: `TICKET-${String(updatedTicket.id).padStart(6, "0")}`,
        title: updatedTicket.title,
        description: updatedTicket.description,
        comment: updatedTicket.comment || "",
        status: updatedTicket.status.toLowerCase(),
        priority: updatedTicket.priority?.toLowerCase() || "medium",
        category: updatedTicket.category || "",
        parentId: updatedTicket.parentId
          ? String(updatedTicket.parentId)
          : null, // ← added
        parentTicket: updatedTicket.parent
          ? {
              // ← added
              id: String(updatedTicket.parent.id),
              title: updatedTicket.parent.title,
              ticketNumber: `TICKET-${String(updatedTicket.parent.id).padStart(6, "0")}`,
            }
          : null,
        createdAt: updatedTicket.createdAt,
        updatedAt: updatedTicket.updatedAt,
        resolvedAt: updatedTicket.resolvedAt,
        closedAt: updatedTicket.closedAt,
        client: updatedTicket.client
          ? {
              id: String(updatedTicket.client.id),
              company: updatedTicket.client.company || "",
              user: {
                id: String(updatedTicket.client.user.id),
                name: updatedTicket.client.user.name,
                email: updatedTicket.client.user.email,
                phone: updatedTicket.client.user.phone,
                avatar: updatedTicket.client.user.avatar,
              },
            }
          : null,
        assignedTo: updatedTicket.assignedTo
          ? {
              id: String(updatedTicket.assignedTo.id),
              name: updatedTicket.assignedTo.name,
              role: updatedTicket.assignedTo.role,
            }
          : null,
        attachments: updatedTicket.attachments || [],
        commentBoxes: updatedTicket.commentBoxes || [],
        messages: updatedTicket.messages || [],
        _count: {
          messages: updatedTicket._count?.messages || 0,
          attachments: updatedTicket._count?.attachments || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("=== UPDATE TICKET ERROR ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);

    return NextResponse.json(
      {
        error: "Failed to update ticket",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAny([SUPPORT_UPDATE_EDIT]);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = await params;

    const ticketId = Number(id);

    if (isNaN(ticketId)) {
      return NextResponse.json(
        {
          error: "Invalid ticket ID",
        },
        {
          status: 400,
        },
      );
    }

    const existing = await db.supportTicket.findUnique({
      where: {
        id: ticketId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          error: "Ticket not found",
        },
        {
          status: 404,
        },
      );
    }

    await db.supportTicket.delete({
      where: {
        id: ticketId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("DELETE TICKET ERROR:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : error,
      },
      {
        status: 500,
      },
    );
  }
}