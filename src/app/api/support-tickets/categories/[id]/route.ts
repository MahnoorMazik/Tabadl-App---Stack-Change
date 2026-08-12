// app/api/support-tickets/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize, Module, Action } from "@/lib/rbac";

const SUPPORT_VIEW_PERMISSION = `${Module.SUPPORT}.${Action.VIEW}`;
const SUPPORT_CREATE_PERMISSION = `${Module.SUPPORT}.${Action.CREATE}`;
// GET - Fetch a single category by ID with all children recursively
export async function GET(
  request: NextRequest,
  { params }: { params:Promise<{ id: string }> },
) {
  try {
    const authResult = await authorize(SUPPORT_VIEW_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Category ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // Recursive function for children
    const getCategoryTree = async (categoryId: string) => {
      const category = await db.supportCategory.findUnique({
        where: {
          id: categoryId,
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
          children: {
            select: {
              id: true,
              name: true,
              isActive: true,
              parentId: true,
            },
          },
        },
      });

      if (!category) {
        return null;
      }

      const children = await Promise.all(
        category.children.map(async (child) => {
          return await getCategoryTree(child.id);
        }),
      );

      return {
        ...category,
        children,
      };
    };

    const category = await getCategoryTree(id);

    if (!category) {
      return NextResponse.json(
        {
          error: "Category not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Category GET Error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch category",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

// PUT - Update a category by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise< { id: string }> },
) {
  try {
    const authResult = await authorize(SUPPORT_CREATE_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } =await  params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Category ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();
    const { name, isActive, parentId } = body;

    // Check if category exists
    const existingCategory = await db.supportCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        {
          error: "Category not found",
        },
        {
          status: 404,
        },
      );
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          {
            error: "Category name cannot be empty",
          },
          {
            status: 400,
          },
        );
      }

      // Check if another category with the same name exists at the same level
      const duplicateCategory = await db.supportCategory.findFirst({
        where: {
          name: name.trim(),
          parentId:
            parentId !== undefined ? parentId : existingCategory.parentId,
          id: { not: id },
        },
      });

      if (duplicateCategory) {
        return NextResponse.json(
          {
            error: "A category with this name already exists at this level",
          },
          {
            status: 409,
          },
        );
      }

      updateData.name = name.trim();
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (parentId !== undefined) {
      // Check if parent exists
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

        // Check for circular reference
        if (parentId === id) {
          return NextResponse.json(
            {
              error: "A category cannot be its own parent",
            },
            {
              status: 400,
            },
          );
        }
      }

      updateData.parentId = parentId || null;
    }

    // Update the category
    const updatedCategory = await db.supportCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });

    return NextResponse.json(
      {
        message: "Category updated successfully",
        data: updatedCategory,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Category PUT Error:", error);

    return NextResponse.json(
      {
        error: "Failed to update category",
      },
      {
        status: 500,
      },
    );
  }
}

// DELETE - Delete a category by ID (cascade children + allow even if used in tickets)
export async function DELETE(
  request: NextRequest,
  { params }: { params:Promise< { id: string }> }
) {
  try {
    const authResult = await authorize(SUPPORT_CREATE_PERMISSION);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 },
      );
    }

    // Check if category exists
    const existingCategory = await db.supportCategory.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Helper: collect all descendant IDs (including self) recursively
    const collectAllIds = async (categoryId: string): Promise<string[]> => {
      const category = await db.supportCategory.findUnique({
        where: { id: categoryId },
        include: { children: { select: { id: true } } },
      });

      if (!category) return [];

      let ids = [categoryId];
      for (const child of category.children) {
        const childIds = await collectAllIds(child.id);
        ids = ids.concat(childIds);
      }
      return ids;
    };

    const allIds = await collectAllIds(id);

    // Remove category reference from all tickets that use any of these categories
    // (so deletion is allowed even when tickets are using them)
    await db.supportTicket.updateMany({
      where: {
        category: { in: allIds },
      },
      data: {
        category: null,
      },
    });

    // Recursively delete children first, then the parent (avoids FK issues)
    const deleteRecursive = async (categoryId: string) => {
      const category = await db.supportCategory.findUnique({
        where: { id: categoryId },
        include: { children: { select: { id: true } } },
      });

      if (!category) return;

      // Delete all children first
      for (const child of category.children) {
        await deleteRecursive(child.id);
      }

      // Then delete self
      await db.supportCategory.delete({
        where: { id: categoryId },
      });
    };

    await deleteRecursive(id);

    return NextResponse.json(
      {
        message: "Category and its subcategories deleted successfully",
        data: { id, deletedCount: allIds.length },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Category DELETE Error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete category",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}