import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { sql } from "./db"
import type { User, Business } from "./types"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      businessId: string
    }
  }
  interface User {
    role: string
    businessId: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: string
    businessId: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        try {
          // Find user by email
          const users = await sql`
            SELECT * FROM users WHERE email = ${email}
          `

          if (users.length === 0) {
            return null
          }

          const user = users[0] as User & { is_blocked?: boolean }

          if (user.is_blocked) {
            return null
          }

          const verificationUser = user as User & {
            email_verified?: boolean
            requires_email_verification?: boolean
          }

          if (verificationUser.requires_email_verification && !verificationUser.email_verified) {
            return null
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password_hash)

          if (!isValidPassword) {
            return null
          }

          // Get user's business
          const businesses = await sql`
            SELECT * FROM businesses WHERE user_id = ${user.id}
          `

          const business = businesses[0] as Business | undefined

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            businessId: business?.id || "",
          }
        } catch (error) {
          console.error("Auth authorize error:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
        token.businessId = user.businessId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.businessId = token.businessId
      }
      return session
    },
  },
})

// Helper to get current session in server components
export async function getSession() {
  return await auth()
}

// Helper to require authentication
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  return session
}

// Helper to require admin role
export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden")
  }
  return session
}
