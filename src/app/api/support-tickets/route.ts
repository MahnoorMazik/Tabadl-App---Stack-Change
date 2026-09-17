import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import {
  ensureSupportUploadDir,
  getSupportUploadDir,
  supportStorageRelativePath,
} from "@/lib/support/supportAttachmentStorage";
import { dispatchEvent } from "@/lib/notifications/service";
import { startOfDay, endOfDay } from "date-fns";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { hasPermission, Module, Action, authorize } from "@/lib/rbac";

const MAX_ATTACHMENTS = 10;
const MAX_COMMENT_BOXES = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

// Define permissions
const SUPPORT_VIEW_PERMISSION = `${Module.SUPPORT}.${Action.VIEW}`;
const SUPPORT_CREATE_PERMISSION = `${Module.SUPPORT}.${Action.CREATE}`;
const SUPPORT_UPDATE_PERMISSION = `${Module.SUPPORT}.${Action.UPDATE}`;
const SUPPORT_DELETE_PERMISSION = `${Module.SUPPORT}.${Action.DELETE}`;

// Helper function for case-insensitive search
function containsInsensitive(term: string) {
  return {
    contains: term,
  };
}
// builder function of child
async function buildHasChildrenMap(
  ticketCategoryIds: string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (ticketCategoryIds.length === 0) return result;

  const allCategories = await db.supportCategory.findMany({
    select: { id: true, parentId: true },
  });

  const childrenOf = new Map<string, string[]>();
  for (const c of allCategories) {
    if (c.parentId) {
      const list = childrenOf.get(c.parentId) || [];
      list.push(c.id);
      childrenOf.set(c.parentId, list);
    }
  }

  const categoriesWithTickets = await db.supportTicket.groupBy({
    by: ["category"],
    where: { category: { not: null } },
    _count: true,
  });

  const catsWithTickets = new Set(
    categoriesWithTickets
      .map((g) => g.category)
      .filter((c): c is string => !!c),
  );

  function hasDescendantTickets(catId: string): boolean {
    const kids = childrenOf.get(catId) || [];
    for (const kid of kids) {
      if (catsWithTickets.has(kid)) return true;
      if (hasDescendantTickets(kid)) return true;
    }
    return false;
  }

  const unique = [...new Set(ticketCategoryIds.filter(Boolean))];
  for (const catId of unique) {
    result.set(catId, hasDescendantTickets(catId));
  }

  return result;
}

// Build where clause for list
async function buildSupportListWhere(
  searchParams: URLSearchParams,
): Promise<any> {
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const clientId = searchParams.get("clientId");
  const assignedToId = searchParams.get("assignedToId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: any = {};

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { title: containsInsensitive(term) },
      { description: containsInsensitive(term) },
      { comment: containsInsensitive(term) },
    ];
  }

  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }

  if (priority && priority !== "all") {
    where.priority = priority.toUpperCase();
  }

  if (clientId?.trim()) {
    where.clientId = clientId.trim();
  }

  if (assignedToId?.trim()) {
    where.assignedToId = assignedToId.trim();
  }

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (dateFrom?.trim()) {
    const d = new Date(dateFrom.trim());
    if (!Number.isNaN(d.getTime())) createdAt.gte = startOfDay(d);
  }
  if (dateTo?.trim()) {
    const d = new Date(dateTo.trim());
    if (!Number.isNaN(d.getTime())) createdAt.lte = endOfDay(d);
  }
  if (createdAt.gte || createdAt.lte) {
    where.createdAt = createdAt;
  }

  return where;
}

// Helper to get prefix for display IDs
async function getPrefixedEntityPrefix(db: any, entity: string) {
  return null;
}

function withSupportDisplayIds(rows: any[], prefix: string | null) {
  return rows.map((row) => ({
    ...row,
    ticketNumber: `${prefix || "TICKET"}-${String(row.id).padStart(6, "0")}`,
  }));
}

// GET - List support tickets
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(SUPPORT_VIEW_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const session = authResult.session!;

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format");

    let sortBy = searchParams.get("sortBy");
    let sortOrder = searchParams.get("sortOrder") || "desc";
    if (!sortBy) {
      const legacy = searchParams.get("sort") || "createdAt_desc";
      const parts = legacy.split("_");
      sortBy = parts[0] || "createdAt";
      sortOrder = parts[1] || "desc";
    }

    const limitParam = searchParams.get("limit");
    let limit = 25;
    let skip = 0;
    let page = 1;

    if (limitParam === "all") {
      limit = 10000;
      skip = 0;
    } else {
      page = parseInt(searchParams.get("page") || "1", 10);
      limit = Math.min(parseInt(limitParam || "25", 10), 100);
      skip = (page - 1) * limit;
    }

    const sortAllowlist: Record<string, "asc" | "desc"> = {
      id: sortOrder === "asc" ? "asc" : "desc",
      title: sortOrder === "asc" ? "asc" : "desc",
      status: sortOrder === "asc" ? "asc" : "desc",
      priority: sortOrder === "asc" ? "asc" : "desc",
      createdAt: sortOrder === "asc" ? "asc" : "desc",
      updatedAt: sortOrder === "asc" ? "asc" : "desc",
    };
    const allowedSort = sortAllowlist[sortBy] ? sortBy : "createdAt";
    const orderBy = {
      [allowedSort]: sortAllowlist[allowedSort] || "desc",
    } as const;
    const where = await buildSupportListWhere(searchParams);

    const [rows, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
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
              email: true,
              avatar: true,
            },
          },
          // ===== YE ADD KARO =====
          parent: {
            select: {
              id: true,
              title: true,
            },
          },
          commentBoxes: {
            include: {
              attachments: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              messages: true,
              attachments: true,
              children: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.supportTicket.count({ where }),
    ]);

    const prefix = await getPrefixedEntityPrefix(db, "supportTicket");
    const tickets = withSupportDisplayIds(rows, prefix);
    const categoryIds = tickets
      .map((t: any) => t.category)
      .filter((c: any): c is string => !!c);

    const hasChildrenMap = await buildHasChildrenMap(categoryIds);

    const transformedTickets = tickets.map((ticket: any) => ({
      id: String(ticket.id),
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      comment: ticket.comment || "",
      status: ticket.status.toLowerCase(),
      priority: ticket.priority?.toLowerCase() || "medium",
      category: ticket.category || "",
      parentId: ticket.parentId ? String(ticket.parentId) : null,
      parentTicket: ticket.parent
        ? {
            id: String(ticket.parent.id),
            title: ticket.parent.title,
            ticketNumber: `TICKET-${String(ticket.parent.id).padStart(6, "0")}`,
          }
        : null,
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
            email: ticket.assignedTo.email,
            avatar: ticket.assignedTo.avatar,
          }
        : null,
      commentBoxes: ticket.commentBoxes || [],
      messages: [],
      attachments: [],
      _count: {
        messages: ticket._count?.messages || 0,
        attachments: ticket._count?.attachments || 0,
      },
      // Real children count se hasChildren
      hasChildren: (ticket._count?.children || 0) > 0,
      childTickets: [],
    }));

    const response = {
      data: {
        tickets: transformedTickets,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
          currentPage: page,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Support tickets list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create new support ticket
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize(SUPPORT_CREATE_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const session = authResult.session!;
    const contentType = request.headers.get("content-type") || "";
    let title: string;
    let description: string;
    let comment: string = "";
    let status = "open";
    let priority = "medium";
    let category = "";
    let assignedToId: string | null = null;
    let parentId: number | null = null; // ← declare here (top level)
    let files: File[] = [];
    let commentBoxesData: any[] = [];
    const commentBoxFiles: { [key: string]: File[] } = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const t = formData.get("title");
      const d = formData.get("description");
      const c = formData.get("comment");

      if (typeof t !== "string" || !t.trim()) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 },
        );
      }

      title = t.trim();
      description = typeof d === "string" ? d.trim() : "";

      if (c && typeof c === "string") {
        comment = c.trim();
      }

      // Get comment boxes data
      const commentBoxesJson = formData.get("commentBoxes");
      if (commentBoxesJson && typeof commentBoxesJson === "string") {
        try {
          const parsed = JSON.parse(commentBoxesJson);
          if (Array.isArray(parsed)) {
            commentBoxesData = parsed;
            if (commentBoxesData.length > MAX_COMMENT_BOXES) {
              return NextResponse.json(
                { error: `Maximum ${MAX_COMMENT_BOXES} comment boxes allowed` },
                { status: 400 },
              );
            }
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

      const s = formData.get("status");
      if (s && typeof s === "string") status = s;

      const p = formData.get("priority");
      if (p && typeof p === "string") priority = p;

      const cat = formData.get("category");
      if (cat && typeof cat === "string") category = cat;

      const assigned = formData.get("assignedToId");
      if (assigned && typeof assigned === "string" && assigned) {
        assignedToId = assigned;
      }

      // ===== Parent Ticket =====
      const parentIdRaw = formData.get("parentId");
      if (
        parentIdRaw &&
        typeof parentIdRaw === "string" &&
        parentIdRaw.trim() &&
        parentIdRaw !== "none"
      ) {
        const parsed = parseInt(parentIdRaw, 10);
        if (!isNaN(parsed)) parentId = parsed;
      }

      const fileList = formData
        .getAll("attachments")
        .filter((f): f is File => f instanceof File && f.size > 0);

      if (fileList.length > MAX_ATTACHMENTS) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ATTACHMENTS} attachments allowed` },
          { status: 400 },
        );
      }
      files = fileList;
    } else {
      const body = await request.json();
      if (!body.title?.trim()) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 },
        );
      }

      title = body.title.trim();
      description = body.description?.trim() || "";
      comment = body.comment?.trim() || "";
      status = body.status || "open";
      priority = body.priority || "medium";
      category = body.category || "";
      assignedToId = body.assignedToId || null;
      commentBoxesData = body.commentBoxes || [];

      // ===== Parent Ticket (JSON body) =====
      if (body.parentId && body.parentId !== "none") {
        const parsed = parseInt(String(body.parentId), 10);
        if (!isNaN(parsed)) parentId = parsed;
      }

      if (commentBoxesData.length > MAX_COMMENT_BOXES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_COMMENT_BOXES} comment boxes allowed` },
          { status: 400 },
        );
      }
    }

    const userId = session.user.id;

    await ensureSupportUploadDir();
    const uploadDir = getSupportUploadDir();

    const attachmentData: {
      fileName: string;
      filePath: string;
      fileSize: number;
      fileType: string;
    }[] = [];

    function cleanFileName(name: string) {
      return name.replace(/[^a-zA-Z0-9.-]/g, "_");
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `${file.name} exceeds the maximum size of 10MB.`,
          },
          { status: 400 },
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `${file.name} is not supported. Only PDF, JPG, JPEG and PNG files are allowed.`,
          },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeFileName = `${randomUUID()}-${cleanFileName(file.name)}`;
      await writeFile(join(uploadDir, safeFileName), buffer);

      attachmentData.push({
        fileName: file.name,
        filePath: supportStorageRelativePath(safeFileName),
        fileSize: file.size,
        fileType: file.type,
      });
    }

    const ticketId = await db.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          title,
          description,
          comment: comment || undefined,
          status: status.toUpperCase() as any,
          priority: priority.toUpperCase() as any,
          category: category || undefined,
          createdById: userId,
          assignedToId: assignedToId || undefined,
          parentId: parentId || undefined, // ← now in scope
        },
      });

      if (attachmentData.length > 0) {
        await tx.supportTicketAttachment.createMany({
          data: attachmentData.map((a) => ({ ticketId: ticket.id, ...a })),
        });
      }

      // Create comment boxes
      if (commentBoxesData.length > 0) {
        for (let i = 0; i < commentBoxesData.length; i++) {
          const boxData = commentBoxesData[i];
          const boxId = boxData.tempId || `comment-${Date.now()}-${i}`;

          const commentBox = await tx.supportTicketCommentBox.create({
            data: {
              ticketId: ticket.id,
              comment: boxData.comment || "",
              order: i,
            },
          });

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

      return ticket.id;
    });

    const created = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        parent: {
          // ← optional but good
          select: {
            id: true,
            title: true,
          },
        },
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
        _count: { select: { messages: true } },
      },
    });

    if (!created) {
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 },
      );
    }

    // Send notification
    try {
      await dispatchEvent({
        eventType: "SUPPORT_TICKET_CREATED",
        title: "New Support Ticket",
        message: `New ticket submitted: "${created.title}"`,
        entityType: "SupportTicket",
        entityId: String(created.id),
        url: `/admin/support?ticket=${created.id}`,
      });
    } catch {
      // non-fatal
    }

    const tPrefix = await getPrefixedEntityPrefix(db, "supportTicket");
    const ticketNumber = `${tPrefix || "TICKET"}-${String(created.id).padStart(6, "0")}`;

    const response = {
      data: {
        id: String(created.id),
        ticketNumber,
        title: created.title,
        description: created.description,
        comment: created.comment || "",
        status: created.status.toLowerCase(),
        priority: created.priority?.toLowerCase() || "medium",
        category: created.category || "",
        parentId: created.parentId ? String(created.parentId) : null, // ← added
        parentTicket: created.parent
          ? {
              id: String(created.parent.id),
              title: created.parent.title,
              ticketNumber: `TICKET-${String(created.parent.id).padStart(6, "0")}`,
            }
          : null,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        client: created.client
          ? {
              id: String(created.client.id),
              company: created.client.company || "",
              user: {
                id: String(created.client.user.id),
                name: created.client.user.name,
                email: created.client.user.email,
                phone: created.client.user.phone,
                avatar: created.client.user.avatar,
              },
            }
          : null,
        assignedTo: created.assignedTo
          ? {
              id: String(created.assignedTo.id),
              name: created.assignedTo.name,
              role: created.assignedTo.role,
            }
          : null,
        commentBoxes: created.commentBoxes || [],
        _count: {
          messages: 0,
        },
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error("❌ Support Ticket API Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
