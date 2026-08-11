

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize, Module, Action, Permission } from "@/lib/rbac";
import { SupportAssigneeRole } from "@prisma/client";

const SUPPORT_EDIT_PERMISSION =
  `${Module.SUPPORT}.${Action.UPDATE}` as Permission;

// Helper to validate enum value
function isValidRole(role: string): role is SupportAssigneeRole {
  return Object.values(SupportAssigneeRole).includes(role as SupportAssigneeRole);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await authorize(SUPPORT_EDIT_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Assignee ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // Check if assignee exists
    const existingAssignee = await db.supportAssignee.findUnique({
      where: { id },
    });

    if (!existingAssignee) {
      return NextResponse.json(
        {
          error: "Assignee not found",
        },
        {
          status: 404,
        },
      );
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

    // Update assignee
    const updatedAssignee = await db.supportAssignee.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        role: role as SupportAssigneeRole,
        isActive: isActive !== undefined ? isActive : existingAssignee.isActive,
      },
    });

    return NextResponse.json({
      message: "Assignee updated successfully",
      data: updatedAssignee,
    });
  } catch (error) {
    console.error("Assignee PUT Error:", error);

    return NextResponse.json(
      {
        error: "Failed to update assignee",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await authorize(SUPPORT_EDIT_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Assignee ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const existingAssignee = await db.supportAssignee.findUnique({
      where: { id },
    });

    if (!existingAssignee) {
      return NextResponse.json(
        {
          error: "Assignee not found",
        },
        {
          status: 404,
        },
      );
    }

    const ticketCount = await db.supportTicket.count({
      where: {
        assignedToId: id,
      },
    });

    if (ticketCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete assignee. They are assigned to ${ticketCount} ticket(s). Reassign or resolve tickets first.`,
        },
        {
          status: 400,
        },
      );
    }

    await db.supportAssignee.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Assignee deleted successfully",
    });
  } catch (error) {
    console.error("Assignee DELETE Error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete assignee",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}