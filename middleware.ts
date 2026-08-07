import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/check-email",
  "/about-us",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
  "/home-new",
  "/misa",
  "/premium-residency"
]

const publicRoutePrefixes = [
  "/verify-email",
  "/invite/collaborator",
]

// Define API routes that don't require authentication
const publicApiRoutes = [
  "/api/auth",
  "/api/collaboration",
  "/api/health",
  "/api/leads/consultation",
  "/api/support-messages",
  "/api/email/send",
  "/api/manifest"
]

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const pathname = nextUrl.pathname

  // Serve dynamic manifest: when user is on admin, /manifest.json returns admin manifest
  // so the installed PWA opens at /admin/dashboard instead of home.
  if (pathname === "/manifest.json") {
    return NextResponse.rewrite(new URL("/api/manifest", req.url))
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next()
  }

  if (publicRoutePrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/socketio") ||
    pathname.startsWith("/api/static") ||
    pathname.includes(".") // Static files like .png, .ico, etc.
  ) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname)
    
    // Determine which login page to redirect to
    if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) {
      return NextResponse.redirect(new URL(`/admin/login?callbackUrl=${callbackUrl}`, nextUrl))
    }
    if (pathname.startsWith("/client")) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl))
    }
    
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl))
  }

  // Check role-based access
  const userRole = session.user.role

  // Admin/Staff routes require STAFF role
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) {
    if (userRole !== "STAFF") {
      // Redirect clients to their dashboard
      if (userRole === "CLIENT" || userRole === "COLLABORATOR") {
        return NextResponse.redirect(new URL("/client/applications", nextUrl))
      }
      return NextResponse.redirect(new URL("/", nextUrl))
    }
  }

  // Client routes require CLIENT or COLLABORATOR role
  if (pathname.startsWith("/client")) {
    if (userRole !== "CLIENT" && userRole !== "COLLABORATOR") {
      // Redirect staff to admin dashboard
      if (userRole === "STAFF") {
        return NextResponse.redirect(new URL("/admin/dashboard", nextUrl))
      }
      return NextResponse.redirect(new URL("/", nextUrl))
    }
    // Collaborators only need applications + collaboration overview (not full client portal)
    if (
      userRole === "COLLABORATOR" &&
      (pathname.startsWith("/client/profile") ||
        pathname.startsWith("/client/documents") ||
        pathname.startsWith("/client/invoices") ||
        pathname.startsWith("/client/messages") ||
        pathname.startsWith("/client/collaborators") ||
        pathname.startsWith("/client/help") ||
        pathname.startsWith("/client/settings"))
    ) {
      return NextResponse.redirect(new URL("/client/applications", nextUrl))
    }
  }

  // Dashboard route - redirect based on role
  if (pathname === "/dashboard" || pathname === "/universal-dashboard") {
    if (userRole === "STAFF") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl))
    }
    if (userRole === "CLIENT" || userRole === "COLLABORATOR") {
      return NextResponse.redirect(new URL("/client/applications", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|mp4|json|txt)$).*)",
    "/manifest.json"
  ]
}
