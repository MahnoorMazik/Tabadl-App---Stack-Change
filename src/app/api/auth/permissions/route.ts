import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { UserRole, StaffType } from "@prisma/client"
import { getDefaultRoleByName, MAIN_ROLE_NAMES, Permission } from "@/lib/rbac"

async function getUserPermissions(user: {
  role: UserRole
  staffType: StaffType | null
  customRoleId: string | null
  customRole?: { permissions: string | null; isActive: boolean } | null
}): Promise<Permission[]> {
  if (user.customRole && user.customRole.isActive && user.customRole.permissions) {
    try {
      return JSON.parse(user.customRole.permissions) as Permission[]
    } catch {
      console.error("Error parsing role permissions")
      return []
    }
  }
  if (user.role === UserRole.STAFF && user.staffType === StaffType.ADMIN) {
    const adminRole = getDefaultRoleByName(MAIN_ROLE_NAMES.ADMIN)
    return adminRole?.permissions ?? []
  }
  if (user.role === UserRole.STAFF) return []
  if (user.role === UserRole.CLIENT) {
    return [
      "dashboard.view",
      "applications.view",
      "documents.view",
      "messages.view",
      "help.view"
    ] as Permission[]
  }
  return []
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch user with custom role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        customRole: true
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 404 }
      )
    }

    // Get permissions
    const permissions = await getUserPermissions({
      role: user.role,
      staffType: user.staffType,
      customRoleId: user.customRoleId,
      customRole: user.customRole
    })

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
