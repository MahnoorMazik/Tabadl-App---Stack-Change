

// app/api/support-tickets/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize, Module, Action } from "@/lib/rbac";

const SUPPORT_VIEW_PERMISSION = `${Module.SUPPORT}.${Action.VIEW}`;
const SUPPORT_CREATE_PERMISSION = `${Module.SUPPORT}.${Action.CREATE}`;

// GET categories with hierarchy
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(SUPPORT_VIEW_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get("includeInactive") === "true";
    const forTickets = searchParams.get("forTickets") === "true";

    // Build where clause
    let whereClause: any = {};

    if (forTickets) {
      whereClause.isActive = true;
    } else if (!includeInactive) {
      whereClause.isActive = true;
    }

    // Fetch all categories with parent-child relationships
    const categories = await db.supportCategory.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          where: whereClause,
          select: {
            id: true,
            name: true,
            isActive: true,
            children: {
              where: whereClause,
              select: {
                id: true,
                name: true,
                isActive: true,
                children: {
                  where: whereClause,
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            tickets: true,
            children: true,
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      data: categories,
      categories: categories,
      success: true,
    });
  } catch (error) {
    console.error("Categories GET Error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        details: error instanceof Error ? error.message : String(error),
        categories: [],
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}

// POST create category with parent support
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize(SUPPORT_CREATE_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const { name, parentId, isActive } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        {
          error: "Category name is required",
        },
        {
          status: 400,
        },
      );
    }

    // Check if parent exists if parentId is provided
    if (parentId) {
      const parentExists = await db.supportCategory.findUnique({
        where: { id: parentId },
      });

      if (!parentExists) {
        return NextResponse.json(
          {
            error: "Parent category does not exist",
          },
          {
            status: 404,
          },
        );
      }
    }

    // Check if category with same name exists at the same level
    const existingCategory = await db.supportCategory.findFirst({
      where: {
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        {
          error: "A category with this name already exists at this level",
        },
        {
          status: 409,
        },
      );
    }

    const category = await db.supportCategory.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tickets: true,
            children: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Category created successfully",
        data: category,
        categories: [category],
        success: true,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Category POST Error:", error);

    return NextResponse.json(
      {
        error: "Failed to create category",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
