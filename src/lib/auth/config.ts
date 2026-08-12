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
        const userType = credentials.userType as string | undefined

        // Find user by email
        const user = await db.user.findFirst({
          where: { 
            email,
            isDeleted: false 
          },
          include: {
            clientProfile: true,
            customRole: true
          }
        })

        if (!user) {
          console.error(`[Auth] User not found: ${email}`)
          throw new Error("No account found with this email")
        }

        if (!user.isActive) {
          console.error(`[Auth] User account is inactive: ${email}`)
          throw new Error("Account is inactive. Contact an administrator.")
        }

        if (userType === "client" && user.role !== UserRole.CLIENT && user.role !== UserRole.COLLABORATOR) {
          console.error(`[Auth] User type mismatch - expected CLIENT/COLLABORATOR, got ${user.role}: ${email}`)
          throw new Error("Invalid credentials")
        }
        if (userType === "staff" && user.role !== UserRole.STAFF) {
          console.error(`[Auth] User type mismatch - expected STAFF, got ${user.role}: ${email}`)
          throw new Error("Invalid credentials")
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) {
          console.error(`[Auth] Invalid password for user: ${email}`)
          throw new Error("Incorrect password")
        }

        // Client self-signup must verify email before login (collaborators verified via invite)
        if (user.role === UserRole.CLIENT && !user.emailVerified) {
          console.error(`[Auth] Email not verified: ${email}`)
          throw new EmailNotVerifiedError()
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        // Permissions fetched on-demand via /api/auth/permissions — not stored in JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
          staffType: user.staffType ?? null,
          avatar: user.avatar ?? null,
          phone: user.phone ?? null,
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