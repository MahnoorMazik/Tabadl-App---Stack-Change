import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        customRole: { select: { id: true, name: true } }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 404 }
      )
    }

    const clientProfile = user.clientProfile ? {
      id: user.clientProfile.id,
      clientNumber: user.clientProfile.clientNumber,
      company: user.clientProfile.company
    } : null

    return NextResponse.json({ 
      clientProfile,
      name: user.name ?? null,
      avatar: user.avatar,
      phone: user.phone,
      customRole: user.customRole ? { id: user.customRole.id, name: user.customRole.name } : null
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
