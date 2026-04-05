"use server"

import { sql } from "@/lib/db"
import { signIn, signOut } from "@/lib/auth"
import { sendOtpEmail } from "@/lib/mailer"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { createHash, randomInt } from "crypto"

let subscriptionLifecycleSchemaReady = false
let emailVerificationSchemaReady = false

const OTP_EXPIRY_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
const OTP_RESEND_COOLDOWN_SECONDS = 60

async function ensureSubscriptionLifecycleSchema() {
  if (subscriptionLifecycleSchemaReady) return

  await sql`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'RAZORPAY',
      ADD COLUMN IF NOT EXISTS last_payment_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE
  `

  subscriptionLifecycleSchemaReady = true
}

async function ensureEmailVerificationSchema() {
  if (emailVerificationSchemaReady) return

  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS requires_email_verification BOOLEAN DEFAULT FALSE
  `

  await sql`
    CREATE TABLE IF NOT EXISTS email_verification_otps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_email_verification_otps_user_id
    ON email_verification_otps(user_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS signup_email_verifications (
      email VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_signup_email_verifications_expires_at
    ON signup_email_verifications(expires_at)
  `

  emailVerificationSchemaReady = true
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

function hashOtp(email: string, otp: string) {
  const secret = process.env.OTP_SECRET || "swift-invoice-otp-secret"
  return createHash("sha256").update(`${normalizeEmail(email)}:${otp}:${secret}`).digest("hex")
}

async function issueSignupOtp(
  email: string,
  name: string,
  passwordHash: string,
  businessName: string
) {
  const otpCode = generateOtpCode()
  const otpHash = hashOtp(email, otpCode)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  await sql`
    INSERT INTO signup_email_verifications (
      email,
      name,
      password_hash,
      business_name,
      otp_hash,
      expires_at,
      attempts,
      created_at,
      updated_at
    )
    VALUES (
      ${email},
      ${name},
      ${passwordHash},
      ${businessName},
      ${otpHash},
      ${expiresAt.toISOString()},
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      business_name = EXCLUDED.business_name,
      otp_hash = EXCLUDED.otp_hash,
      expires_at = EXCLUDED.expires_at,
      attempts = 0,
      updated_at = NOW()
  `

  await sendOtpEmail({
    to: email,
    name,
    otpCode,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  })
}

async function createUserAfterVerifiedSignup(params: {
  email: string
  name: string
  passwordHash: string
  businessName: string
}) {
  const { email, name, passwordHash, businessName } = params

  const userId = uuidv4()
  await sql`
    INSERT INTO users (id, email, name, password_hash, role, email_verified, requires_email_verification)
    VALUES (${userId}, ${email}, ${name}, ${passwordHash}, 'USER', true, false)
  `

  const businessId = uuidv4()
  const invoicePrefix = businessName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3) || "INV"

  await sql`
    INSERT INTO businesses (id, user_id, name, invoice_prefix, invoice_next_number)
    VALUES (${businessId}, ${userId}, ${businessName}, ${invoicePrefix}, 1)
  `

  await ensureSubscriptionLifecycleSchema()
  const subscriptionId = uuidv4()
  const trialStart = new Date()
  const trialEnd = new Date(trialStart)
  trialEnd.setDate(trialEnd.getDate() + 30)

  await sql`
    INSERT INTO subscriptions (
      id,
      user_id,
      plan,
      status,
      trial_starts_at,
      trial_ends_at,
      current_period_start,
      current_period_end,
      payment_provider
    )
    VALUES (
      ${subscriptionId},
      ${userId},
      'TRIAL',
      'ACTIVE',
      ${trialStart.toISOString()},
      ${trialEnd.toISOString()},
      ${trialStart.toISOString()},
      ${trialEnd.toISOString()},
      'RAZORPAY'
    )
  `

  const notificationId = uuidv4()
  await sql`
    INSERT INTO notifications (id, user_id, type, title, message, is_read)
    VALUES (
      ${notificationId},
      ${userId},
      'INFO',
      'Welcome to Swift-Invoice!',
      'Your 30-day free trial has started. Explore all features and upgrade anytime.',
      false
    )
  `
}

export interface AuthState {
  error?: string
  message?: string
  success?: boolean
  redirectTo?: string
}

export async function signUpAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string
  const rawEmail = formData.get("email") as string
  const email = normalizeEmail(rawEmail)
  const password = formData.get("password") as string
  const businessName = formData.get("businessName") as string

  if (!name || !email || !password || !businessName) {
    return { error: "All fields are required" }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" }
  }

  try {
    await ensureEmailVerificationSchema()

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUsers.length > 0) {
      return { error: "An account with this email already exists" }
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await issueSignupOtp(email, name, passwordHash, businessName)

    return {
      success: true,
      redirectTo: `/verify-email?email=${encodeURIComponent(email)}`,
      message: "We sent a 6-digit OTP to your email. Your account will be created after verification.",
    }
  } catch (error) {
    console.error("Sign up error:", error)

    if (error instanceof Error && error.message.includes("DATABASE_URL")) {
      return { error: "Server configuration error: DATABASE_URL is missing" }
    }

    return { error: "Something went wrong. Please try again." }
  }
}

export async function signInAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawEmail = formData.get("email") as string
  const email = normalizeEmail(rawEmail)
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    await ensureEmailVerificationSchema()

    const users = await sql`
      SELECT id, email, name, password_hash, role, email_verified, requires_email_verification
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    if (users.length === 0) {
      return { error: "Invalid email or password" }
    }

    const user = users[0] as {
      id: string
      email: string
      name: string
      password_hash: string
      role: string
      email_verified: boolean
      requires_email_verification: boolean
    }

    if (user.requires_email_verification && !user.email_verified) {
      return {
        error: "Please verify your email before signing in.",
        redirectTo: `/verify-email?email=${encodeURIComponent(email)}`,
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return { error: "Invalid email or password" }
    }

    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    return { success: true, redirectTo: user.role === "ADMIN" ? "/admin" : "/dashboard" }
  } catch (error) {
    console.error("Sign in error:", error)
    return { error: "Invalid email or password" }
  }
}

export async function signOutAction() {
  await signOut({ redirect: false })
  redirect("/login")
}

export async function verifyEmailOtpAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawEmail = formData.get("email") as string
  const email = normalizeEmail(rawEmail)
  const otpCode = (formData.get("otp") as string)?.trim()

  if (!email || !otpCode) {
    return { error: "Email and OTP are required." }
  }

  if (!/^\d{6}$/.test(otpCode)) {
    return { error: "OTP must be a 6-digit code." }
  }

  try {
    await ensureEmailVerificationSchema()

    const existingUsers = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    if (existingUsers.length > 0) {
      await sql`
        DELETE FROM signup_email_verifications
        WHERE email = ${email}
      `

      return {
        success: true,
        message: "Account already exists. You can sign in now.",
        redirectTo: "/login?verified=true",
      }
    }

    const pendingRows = await sql`
      SELECT email, name, password_hash, business_name, otp_hash, attempts, expires_at
      FROM signup_email_verifications
      WHERE email = ${email}
      LIMIT 1
    `

    if (pendingRows.length === 0) {
      return { error: "No pending signup found for this email. Please sign up again." }
    }

    const pending = pendingRows[0] as {
      email: string
      name: string
      password_hash: string
      business_name: string
      otp_hash: string
      attempts: number
      expires_at: string
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return { error: "OTP has expired. Please request a new code." }
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      return { error: "Too many failed attempts. Please request a new code." }
    }

    const isOtpValid = hashOtp(email, otpCode) === pending.otp_hash

    if (!isOtpValid) {
      await sql`
        UPDATE signup_email_verifications
        SET attempts = attempts + 1
        WHERE email = ${email}
      `

      return { error: "Invalid OTP. Please try again." }
    }

    await createUserAfterVerifiedSignup({
      email,
      name: pending.name,
      passwordHash: pending.password_hash,
      businessName: pending.business_name,
    })

    await sql`
      DELETE FROM signup_email_verifications
      WHERE email = ${email}
    `

    return {
      success: true,
      message: "Email verified successfully.",
      redirectTo: "/login?verified=true",
    }
  } catch (error) {
    console.error("Verify email OTP error:", error)
    return { error: "Failed to verify email. Please try again." }
  }
}

export async function resendEmailOtpAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawEmail = formData.get("email") as string
  const email = normalizeEmail(rawEmail)

  if (!email) {
    return { error: "Email is required." }
  }

  try {
    await ensureEmailVerificationSchema()

    const existingUsers = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    if (existingUsers.length > 0) {
      return { message: "Account already exists. Please sign in.", success: true, redirectTo: "/login" }
    }

    const pendingRows = await sql`
      SELECT name, password_hash, business_name, updated_at
      FROM signup_email_verifications
      WHERE email = ${email}
      LIMIT 1
    `

    if (pendingRows.length === 0) {
      return { error: "No pending signup found for this email. Please sign up again." }
    }

    const pending = pendingRows[0] as {
      name: string
      password_hash: string
      business_name: string
      updated_at: string
    }

    const ageSeconds = Math.floor((Date.now() - new Date(pending.updated_at).getTime()) / 1000)

    if (ageSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = OTP_RESEND_COOLDOWN_SECONDS - ageSeconds
      return { error: `Please wait ${waitSeconds}s before requesting another OTP.` }
    }

    await issueSignupOtp(email, pending.name, pending.password_hash, pending.business_name)

    return {
      success: true,
      message: "A new OTP has been sent to your email.",
      redirectTo: `/verify-email?email=${encodeURIComponent(email)}`,
    }
  } catch (error) {
    console.error("Resend email OTP error:", error)
    return { error: "Failed to send OTP. Please try again." }
  }
}
