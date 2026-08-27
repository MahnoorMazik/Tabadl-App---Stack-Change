// import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { authorize } from "@/lib/rbac";
// import { Module, Action } from "@/lib/rbac";

// const SUPPORT_VIEW_PERMISSION = `${Module.SUPPORT}.${Action.VIEW}`;

// async function getDescendantCategoryIds(categoryId: string): Promise<string[]> {
//   const allCategories = await db.supportCategory.findMany({
//     select: { id: true, parentId: true },
//   });

//   const childrenMap = new Map<string, string[]>();
//   for (const cat of allCategories) {
//     if (cat.parentId) {
//       const list = childrenMap.get(cat.parentId) || [];
//       list.push(cat.id);
//       childrenMap.set(cat.parentId, list);
//     }
//   }

//   const descendants: string[] = [];
//   const queue = [categoryId];

//   while (queue.length > 0) {
//     const current = queue.shift()!;
//     const children = childrenMap.get(current) || [];
//     for (const childId of children) {
//       descendants.push(childId);
//       queue.push(childId);
//     }
//   }

//   return descendants;
// }

// function withSupportDisplayIds(rows: any[]) {
//   return rows.map((row) => ({
//     ...row,
//     ticketNumber: `TICKET-${String(row.id).padStart(6, "0")}`,
//   }));
// }

// export async function GET(request: NextRequest) {
//   try {
//     const authResult = await authorize(SUPPORT_VIEW_PERMISSION);
//     if (!authResult.authorized) {
//       return authResult.response!;
//     }

//     const searchParams = request.nextUrl.searchParams;
//     const categoryId = searchParams.get("categoryId");
//     const excludeTicketId = searchParams.get("excludeTicketId");

//     if (!categoryId) {
//       return NextResponse.json(
//         { error: "categoryId is required" },
//         { status: 400 },
//       );
//     }

//     const descendantIds = await getDescendantCategoryIds(categoryId);

//     if (descendantIds.length === 0) {
//       return NextResponse.json({
//         data: { tickets: [], hasChildren: false },
//       });
//     }

//     const where: any = {
//       category: { in: descendantIds },
//     };

//     if (excludeTicketId) {
//       const excludeId = parseInt(excludeTicketId, 10);
//       if (!isNaN(excludeId)) {
//         where.id = { not: excludeId };
//       }
//     }

//     const rows = await db.supportTicket.findMany({
//       where,
//       include: {
//         assignedTo: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             avatar: true,
//           },
//         },
//         _count: {
//           select: {
//             messages: true,
//             attachments: true,
//           },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//       take: 500,
//     });

//     const tickets = withSupportDisplayIds(rows);

//     // Build category tree for hasChildren
//     const allCats = await db.supportCategory.findMany({
//       select: { id: true, parentId: true },
//     });
//     const childrenOf = new Map<string, string[]>();
//     for (const c of allCats) {
//       if (c.parentId) {
//         const list = childrenOf.get(c.parentId) || [];
//         list.push(c.id);
//         childrenOf.set(c.parentId, list);
//       }
//     }

//     const categoryHasTickets = new Set(
//       tickets.map((t: any) => t.category).filter(Boolean),
//     );

//     function categoryHasDescendantTickets(catId: string): boolean {
//       const kids = childrenOf.get(catId) || [];
//       for (const kid of kids) {
//         if (categoryHasTickets.has(kid)) return true;
//         if (categoryHasDescendantTickets(kid)) return true;
//       }
//       return false;
//     }

//     const transformed = tickets.map((ticket: any) => {
//       const hasChildren = ticket.category
//         ? categoryHasDescendantTickets(ticket.category)
//         : false;

//       return {
//         id: String(ticket.id),
//         ticketNumber: ticket.ticketNumber,
//         title: ticket.title,
//         description: ticket.description,
//         comment: ticket.comment || "",
//         status: ticket.status.toLowerCase(),
//         priority: ticket.priority?.toLowerCase() || "medium",
//         category: ticket.category || "",
//         createdAt: ticket.createdAt,
//         updatedAt: ticket.updatedAt,
//         assignedTo: ticket.assignedTo
//           ? {
//               id: String(ticket.assignedTo.id),
//               name: ticket.assignedTo.name,
//               email: ticket.assignedTo.email,
//               avatar: ticket.assignedTo.avatar,
//             }
//           : null,
//         _count: {
//           messages: ticket._count?.messages || 0,
//           attachments: ticket._count?.attachments || 0,
//         },
//         hasChildren,
//         childTickets: [],
//       };
//     });

//     return NextResponse.json({
//       data: {
//         tickets: transformed,
//         hasChildren: transformed.length > 0,
//       },
//     });
//   } catch (error) {
//     console.error("Support tickets children error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/rbac";
import { Module, Action } from "@/lib/rbac";

const SUPPORT_VIEW_PERMISSION = `${Module.SUPPORT}.${Action.VIEW}`;

function withSupportDisplayIds(rows: any[]) {
  return rows.map((row) => ({
    ...row,
    ticketNumber: `TICKET-${String(row.id).padStart(6, "0")}`,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(SUPPORT_VIEW_PERMISSION);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const searchParams = request.nextUrl.searchParams;
    const parentId = searchParams.get("parentId");
    const excludeTicketId = searchParams.get("excludeTicketId");

    // parentId required
    if (!parentId) {
      return NextResponse.json(
        { error: "parentId is required" },
        { status: 400 },
      );
    }

    const parentIdNum = parseInt(parentId, 10);
    if (isNaN(parentIdNum)) {
      return NextResponse.json(
        { error: "Invalid parentId" },
        { status: 400 },
      );
    }

    const where: any = {
      parentId: parentIdNum,
    };

    // exclude current ticket if needed
    if (excludeTicketId) {
      const excludeId = parseInt(excludeTicketId, 10);
      if (!isNaN(excludeId)) {
        where.id = { not: excludeId };
      }
    }

    const rows = await db.supportTicket.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            messages: true,
            attachments: true,
            children: true, // kitne children hain
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const tickets = withSupportDisplayIds(rows);

    const transformed = tickets.map((ticket: any) => {
      return {
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
        assignedTo: ticket.assignedTo
          ? {
              id: String(ticket.assignedTo.id),
              name: ticket.assignedTo.name,
              email: ticket.assignedTo.email,
              avatar: ticket.assignedTo.avatar,
            }
          : null,
        _count: {
          messages: ticket._count?.messages || 0,
          attachments: ticket._count?.attachments || 0,
        },
        // agar is ticket ke bhi children hain to expand icon dikhega
        // hasChildren: (ticket._count?.children || 0) > 0,
        childTickets: [],
      };
    });

    return NextResponse.json({
      data: {
        tickets: transformed,
        hasChildren: transformed.length > 0,
      },
    });
  } catch (error) {
    console.error("Support tickets children error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}