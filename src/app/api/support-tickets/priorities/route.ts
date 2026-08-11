// app/api/support/priorities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { hasPermission, Module, Action, authorize } from "@/lib/rbac";

const SUPPORT_VIEW_PERMISSION = `${Module.SUPPORT}.${Action.VIEW}`;

// Define priority configuration with proper case
const priorityConfig = [
  { id: "low", name: "Low", color: "#6B7280", value: "LOW" },
  { id: "medium", name: "Medium", color: "#3B82F6", value: "MEDIUM" },
  { id: "high", name: "High", color: "#F59E0B", value: "HIGH" },
  { id: "urgent", name: "Urgent", color: "#EF4444", value: "URGENT" },
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

    // Get priority counts from database using proper enum values
    const priorityCounts = await db.supportTicket.groupBy({
      by: ["priority"],
      _count: {
        priority: true,
      },
    });

    // Create a map of priority to count
    const countMap = priorityCounts.reduce(
      (acc, curr) => {
        acc[curr.priority] = curr._count.priority;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Build response with all priorities and their counts
    const result = priorityConfig.map((priority) => ({
      id: priority.id,
      name: priority.name,
      color: priority.color,
      _count: {
        tickets: countMap[priority.value] || 0,
      },
    }));

    return NextResponse.json({ priorities: result });
  } catch (error) {
    console.error("Error fetching priorities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
