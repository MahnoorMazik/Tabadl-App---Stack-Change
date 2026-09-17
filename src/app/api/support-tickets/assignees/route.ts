

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize, Module, Action, Permission } from "@/lib/rbac";
import { SupportAssigneeRole } from "@prisma/client";

const SUPPORT_EDIT_PERMISSION =
  `${Module.SUPPORT}.${Action.CREATE}` as Permission;

function isValidRole(role: string): role is SupportAssigneeRole {
  return Object.values(SupportAssigneeRole).includes(role as SupportAssigneeRole);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize(SUPPORT_EDIT_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const { name, email, role, isActive } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        {
          error: "Name is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!role?.trim()) {
      return NextResponse.json(
        {
          error: "Role is required",
        },
        {
          status: 400,
        },
      );
    }

    // ✅ Validate role is a valid enum value
    if (!isValidRole(role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${Object.values(SupportAssigneeRole).join(", ")}`,
        },
        {
          status: 400,
        },
      );
    }

    // Create assignee
    const newAssignee = await db.supportAssignee.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        role: role as SupportAssigneeRole,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({
      message: "Assignee created successfully",
      data: newAssignee,
    });
  } catch (error) {
    console.error("Assignee POST Error:", error);

    return NextResponse.json(
      {
        error: "Failed to create assignee",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(`${Module.SUPPORT}.${Action.VIEW}` as Permission);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    // ✅ FIXED: Get assignees with ticket counts using raw query or manual counting
    const assignees = await db.supportAssignee.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get ticket counts for each assignee
    const assigneesWithCounts = await Promise.all(
      assignees.map(async (assignee) => {
        const ticketCount = await db.supportTicket.count({
          where: {
            assignedToId: assignee.id,
          },
        });
        return {
          ...assignee,
          _count: {
            tickets: ticketCount,
          },
        };
      })
    );

    return NextResponse.json({
      data: assigneesWithCounts,
    });
  } catch (error) {
    console.error("Assignee GET Error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch assignees",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}