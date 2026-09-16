import NextAuth, { User, CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole, StaffType } from "@prisma/client"
import { Permission } from "@/lib/rbac"

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED"
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: UserRole
      staffType: StaffType | null
      avatar: string | null
      phone: string | null
      permissions: Permission[]
      clientProfile?: {
        id: string
        clientNumber: string
        company: string | null
      } | null
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    role: UserRole
    staffType: StaffType | null
    avatar: string | null
    phone: string | null
    permissions: Permission[]
    clientProfile?: {
      id: string
      clientNumber: string
      company: string | null
    } | null
  }
}

// JWT module augmentation - disabled due to NextAuth 5 beta changes
// Types are handled via 'any' casts in callbacks

// .NET backend base URL for auth
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as any,
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        userType: { label: "User Type", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const email = credentials.email as string
        const password = credentials.password as string
        const userType = (credentials.userType as string | undefined) || 'client'

        // ✅ Call .NET backend for authentication
        let loginResponse: Response
        try {
          loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, audience: userType }),
          })
        } catch (fetchError) {
          console.error('[Auth] Failed to reach .NET backend:', fetchError)
          throw new Error('Unable to reach authentication service. Please try again.')
        }

        const loginPayload = await loginResponse.json().catch(() => ({}))

        // .NET returns 200 even on failure — check `success` flag
        if (!loginResponse.ok || !loginPayload?.success) {
          const errMsg = loginPayload?.error || 'Invalid credentials'

          if (errMsg === 'EMAIL_NOT_VERIFIED') {
            throw new EmailNotVerifiedError()
          }
          if (errMsg === 'No account found with this email') {
            throw new Error('No account found with this email')
          }
          if (errMsg === 'Incorrect password') {
            throw new Error('Incorrect password')
          }
          if (errMsg.includes('inactive')) {
            throw new Error('Account is inactive. Contact an administrator.')
          }
          throw new Error(errMsg)
        }

        const dotnetUser = loginPayload.user
        if (!dotnetUser?.id || !dotnetUser?.email) {
          throw new Error('Invalid response from authentication service')
        }

        // ✅ Optionally: sync .NET user back to SQLite (Prisma) so other modules keep working
        // This keeps `db.user` in sync for `jwt` callback (which reads from Prisma by id)
        try {
          const existing = await db.user.findFirst({
            where: { email: dotnetUser.email, isDeleted: false },
            select: { id: true },
          })

          if (!existing) {
            // Create a mirror record in SQLite so token-based sessions work
            await db.user.create({
              data: {
                id: dotnetUser.id,
                email: dotnetUser.email,
                name: dotnetUser.name ?? '',
                role: (dotnetUser.role as UserRole) ?? UserRole.CLIENT,
                passwordHash: '$2b$12$DOTNET_MANAGED', // placeholder — password lives in .NET/Postgres
                emailVerified: dotnetUser.emailVerified ? new Date() : null,
                isActive: true,
                isDeleted: false,
              },
            })
          } else if (existing.id !== dotnetUser.id) {
            // ID mismatch — keep DB row as-is; jwt callback will re-read by dotnetUser.id
            console.warn(`[Auth] SQLite user id (${existing.id}) differs from .NET id (${dotnetUser.id})`)
          }
        } catch (syncErr) {
          // Non-fatal — auth still succeeds even if SQLite mirror fails
          console.error('[Auth] SQLite mirror sync failed (non-fatal):', syncErr)
        }

        // Return the user object expected by NextAuth
        return {
          id: dotnetUser.id,
          email: dotnetUser.email,
          name: dotnetUser.name ?? null,
          role: (dotnetUser.role as UserRole) ?? UserRole.CLIENT,
          staffType: null,
          avatar: null,
          phone: null,
        } as User
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      // Validate existing token: user must still exist in DB (handles DB reset / fresh deploy)
      if (token?.id && trigger !== "signIn") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            staffType: true,
            avatar: true,
            phone: true,
            isActive: true,
            isDeleted: true,
            tokenVersion: true,
          },
        })
        if (!dbUser || !dbUser.isActive || dbUser.isDeleted) {
          return {}
        }
        // Keep JWT identity in sync with DB so middleware + API agree on role
        token.role = dbUser.role
        token.staffType = dbUser.staffType
        token.email = dbUser.email
        token.name = dbUser.name ?? null
        token.avatar = dbUser.avatar ?? null
        token.phone = dbUser.phone ?? null
        token.tokenVersion = dbUser.tokenVersion
      }

      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email ?? ''
        token.name = user.name ?? null
        token.role = user.role as UserRole
        token.staffType = user.staffType as StaffType | null
        token.avatar = user.avatar ?? null
        token.phone = user.phone ?? null
        token.tokenVersion = 0
      }

      // Handle session update (e.g. after profile picture upload)
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            name: true,
            avatar: true,
            phone: true,
            role: true,
            staffType: true,
            tokenVersion: true,
            isActive: true,
          },
        })

        if (dbUser && dbUser.isActive) {
          token.name = dbUser.name ?? null
          token.avatar = dbUser.avatar ?? null
          token.phone = dbUser.phone ?? null
          token.role = dbUser.role
          token.staffType = dbUser.staffType
          token.tokenVersion = dbUser.tokenVersion
        }
      }

      return token
    },
    async session({ session, token }: any) {
      if (token?.id) {
        // Store only essential user data in session to reduce cookie size
        // Permissions and clientProfile are fetched on-demand via API
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string | null,
          role: token.role as UserRole,
          staffType: token.staffType as StaffType | null,
          avatar: token.avatar as string | null,
          phone: token.phone as string | null,
          // Permissions removed from session - fetch via /api/auth/permissions
          permissions: [],
          // ClientProfile removed from session - fetch via /api/auth/profile if needed
          clientProfile: null
        }
      } else {
        session.user = null
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signIn({ user }) {
      console.log(`[NextAuth] User signed in: ${user.email}`)
    },
    async signOut({ token }: any) {
      console.log(`[NextAuth] User signed out: ${token?.email}`)
    }
  },
  debug: process.env.NODE_ENV === "development"
})