// app/api/support/statuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { hasPermission, Module, Action, authorize } from "@/lib/rbac";

const SUPPORT_VIEW_PERMISSION = `${Module.SUPPORT}.${Action.VIEW}`;

// Define status configuration with proper case
const statusConfig = [
  { id: "new", name: "New", color: "#3B82F6", value: "NEW" },
  {
    id: "in-progress",
    name: "In Progress",
    color: "#F59E0B",
    value: "IN_PROGRESS",
  },
  { id: "resolved", name: "Resolved", color: "#10B981", value: "RESOLVED" },
  { id: "closed", name: "Closed", color: "#6B7280", value: "CLOSED" },
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorize(SUPPORT_VIEW_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Get status counts from database using proper enum values
    const statusCounts = await db.supportTicket.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    // Create a map of status to count
    const countMap = statusCounts.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Build response with all statuses and their counts
    const result = statusConfig.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color,
      _count: {
        tickets: countMap[status.value] || 0,
      },
    }));

    return NextResponse.json({ statuses: result });
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
