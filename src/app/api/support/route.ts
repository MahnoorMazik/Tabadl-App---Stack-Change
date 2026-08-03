import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import {
  ensureSupportUploadDir,
  getSupportUploadDir,
  supportStorageRelativePath,
} from "@/lib/support/supportAttachmentStorage";
import { Prisma } from "@prisma/client";
import { dispatchEvent } from "@/lib/notifications/service";
import { startOfDay, endOfDay } from "date-fns";

const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

// Mock auth function
async function auth() {
  // Replace with your actual auth implementation
  return null;
}

// Mock authorize functions
async function authorizeAny(session: any, permissions: any[]) {
  if (!session?.user) {
    return { authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { authorized: true };
}

async function authorize(session: any, permission: any) {
  if (!session?.user) {
    return { authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { authorized: true };
}

// Mock RBAC functions
const SUPPORT_ACCESS_PERMISSIONS = ["support:read"];
const SUPPORT_VIEW_ADD = "support:create";

// Mock support permissions functions
async function getSupportListCreatedByFilter(session: any) {
  return null; // Or implement based on your needs
}

// Mock prefixed ref functions
async function getPrefixedEntityPrefix(prisma: any, entity: string) {
  return null;
}

function withSupportDisplayIds(rows: any[], prefix: string | null) {
  return rows.map(row => ({
    ...row,
    displayId: `${prefix || 'TICKET'}-${String(row.id).padStart(6, '0')}`
  }));
}

function withSupportDisplayIdField(row: any, prefix: string | null) {
  return {
    ...row,
    displayId: `${prefix || 'TICKET'}-${String(row.id).padStart(6, '0')}`
  };
}

// Mock search filter function
function containsInsensitive(term: string) {
  return {
    contains: term,
    mode: 'insensitive' as const
  };
}

// Mock support status validation
function isValidSupportStatus(status: string): boolean {
  return ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status);
}

// Mock Prisma client
const prisma = {
  supportTicket: {
    findMany: async (options: any) => [],
    count: async (options: any) => 0,
    create: async (options: any) => ({ id: 1 }),
    findUnique: async (options: any) => null
  },
  user: {
    findMany: async (options: any) => []
  },
  supportTicketAttachment: {
    createMany: async (options: any) => ({ count: 0 })
  },
  $transaction: async (callback: any) => {
    const tx = {
      supportTicket: {
        create: async (data: any) => ({ id: 1 }),
      },
      supportTicketAttachment: {
        createMany: async (data: any) => ({ count: 0 })
      }
    };
    return callback(tx);
  }
};

function escapeCsv(s: string): string {
  const needQuote = /[",\n\r]/.test(s);
  const t = s.replace(/"/g, '""');
  return needQuote ? `"${t}"` : t;
}

// Inline implementation of buildSupportListWhere
async function buildSupportListWhere(
  searchParams: URLSearchParams
): Promise<Prisma.SupportTicketWhereInput> {
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const createdById = searchParams.get("createdById");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Prisma.SupportTicketWhereInput = {};

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { title: containsInsensitive(term) },
      { description: containsInsensitive(term) }
    ];
  }
  
  if (status && status !== "all" && isValidSupportStatus(status)) {
    where.status = status as any;
  }
  
  if (createdById?.trim()) {
    const cid = parseInt(createdById, 10);
    if (!Number.isNaN(cid) && cid > 0) where.createdById = cid;
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authResult = await authorizeAny(session, [...SUPPORT_ACCESS_PERMISSIONS]);
    if (!authResult.authorized) return authResult.response!;

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

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const skip = (page - 1) * limit;

    const sortAllowlist: Record<string, "asc" | "desc"> = {
      id: sortOrder === "asc" ? "asc" : "desc",
      title: sortOrder === "asc" ? "asc" : "desc",
      status: sortOrder === "asc" ? "asc" : "desc",
      createdAt: sortOrder === "asc" ? "asc" : "desc",
    };
    const allowedSort = sortAllowlist[sortBy] ? sortBy : "createdAt";
    const orderBy = { [allowedSort]: sortAllowlist[allowedSort] || "desc" } as const;
    const where = await buildSupportListWhere(searchParams);

    const scopeCreatedById = await getSupportListCreatedByFilter(session);
    if (scopeCreatedById != null) {
      where.createdById = scopeCreatedById;
    }

    if (format === "csv") {
      const rows = await prisma.supportTicket.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { attachments: true } },
        },
        orderBy,
        take: 20000,
      });
      const prefix = await getPrefixedEntityPrefix(prisma, "supportTicket");
      const tickets = withSupportDisplayIds(rows, prefix);
      const header = [
        "ID",
        "Title",
        "Status",
        "Created by",
        "Email",
        "Created at (ISO)",
        "Attachments",
      ].join(",");
      const lines = tickets.map((t: any) => {
        const c = t.createdBy;
        const name = c?.name || [c?.firstName, c?.lastName].filter(Boolean).join(" ") || "";
        const created = t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt);
        return [
          escapeCsv(t.displayId),
          escapeCsv(t.title),
          escapeCsv(t.status),
          escapeCsv(name),
          escapeCsv(c?.email || ""),
          escapeCsv(created),
          String(t._count?.attachments ?? 0),
        ].join(",");
      });
      const csv = [header, ...lines].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="support-tickets.csv"',
        },
      });
    }

    const [rows, total, filterCreators] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { attachments: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
      prisma.user.findMany({
        where: { supportTicketsCreated: { some: {} } },
        select: { id: true, name: true, email: true, firstName: true, lastName: true },
        orderBy: { name: "asc" },
      }),
    ]);
    const prefix = await getPrefixedEntityPrefix(prisma, "supportTicket");
    const tickets = withSupportDisplayIds(rows, prefix);

    return NextResponse.json({
      data: tickets,
      filterCreators,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("Support tickets list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authResult = await authorize(session, SUPPORT_VIEW_ADD);
    if (!authResult.authorized) return authResult.response!;

    const contentType = request.headers.get("content-type") || "";
    let title: string;
    let description: string;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const t = formData.get("title");
      const d = formData.get("description");
      if (typeof t !== "string" || !t.trim()) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      if (typeof d !== "string" || !d.trim()) {
        return NextResponse.json({ error: "Description is required" }, { status: 400 });
      }
      title = t.trim();
      description = d.trim();
      const fileList = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
      if (fileList.length > MAX_ATTACHMENTS) {
        return NextResponse.json({ error: `Maximum ${MAX_ATTACHMENTS} attachments allowed` }, { status: 400 });
      }
      files = fileList;
    } else {
      const body = await request.json();
      if (!body.title?.trim()) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      if (!body.description?.trim()) {
        return NextResponse.json({ error: "Description is required" }, { status: 400 });
      }
      title = body.title.trim();
      description = body.description.trim();
    }

    const userId = parseInt(session.user.id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    await ensureSupportUploadDir();
    const uploadDir = getSupportUploadDir();

    const attachmentData: { fileName: string; filePath: string; fileSize: number; fileType: string }[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) continue;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = join(uploadDir, fileName);
      const relativePath = supportStorageRelativePath(fileName);
      await writeFile(filePath, buffer);
      attachmentData.push({ fileName: file.name, filePath: relativePath, fileSize: file.size, fileType: file.type });
    }

    const ticketId = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          title,
          description,
          status: "NEW",
          createdById: userId,
        },
      });
      if (attachmentData.length > 0) {
        await tx.supportTicketAttachment.createMany({
          data: attachmentData.map((a) => ({ ticketId: ticket.id, ...a })),
        });
      }
      return ticket.id;
    });

    const created = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
        attachments: true,
      },
    });

    if (!created) {
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }

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

    const tPrefix = await getPrefixedEntityPrefix(prisma, "supportTicket");
    return NextResponse.json(withSupportDisplayIdField(created, tPrefix), { status: 201 });
  } catch (error) {
    console.error("Support ticket create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}