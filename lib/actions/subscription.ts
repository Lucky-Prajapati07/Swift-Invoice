"use server"

import { redirect } from "next/navigation"
import { randomUUID } from "crypto"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

let subscriptionSchemaReady = false

function getBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
}

async function ensureSubscriptionSchema() {
  if (subscriptionSchemaReady) return

  await sql`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'RAZORPAY',
      ADD COLUMN IF NOT EXISTS last_payment_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE
  `

  await sql`
    CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
      id UUID PRIMARY KEY,
      event_id VARCHAR(255) UNIQUE NOT NULL,
      event_name VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `

  subscriptionSchemaReady = true
}

export async function getBillingData() {
  const session = await auth()
  if (!session?.user?.id) return null

  await ensureSubscriptionSchema()

  const [subscriptionRows, settingsRows] = await Promise.all([
    sql`
      SELECT plan, status, trial_starts_at, trial_ends_at, current_period_start, current_period_end
      FROM subscriptions
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    sql`
      SELECT monthly_price, yearly_price
      FROM admin_settings
      WHERE id = 1
      LIMIT 1
    `,
  ])

  const subscription = subscriptionRows[0] as {
    plan: "TRIAL" | "MONTHLY" | "YEARLY"
    status: "ACTIVE" | "EXPIRED" | "CANCELLED"
    trial_starts_at: string | null
    trial_ends_at: string | null
    current_period_start: string | null
    current_period_end: string | null
  } | undefined

  const now = new Date()
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null

  let displayStatus: "TRIALING" | "ACTIVE" | "EXPIRED" | "CANCELLED" = (subscription?.status as "ACTIVE" | "EXPIRED" | "CANCELLED") || "EXPIRED"
  if (subscription?.plan === "TRIAL" && subscription.status === "ACTIVE") {
    displayStatus = trialEnd && trialEnd > now ? "TRIALING" : "EXPIRED"
  }
  if (subscription?.plan !== "TRIAL" && subscription?.status === "ACTIVE") {
    displayStatus = currentPeriodEnd && currentPeriodEnd > now ? "ACTIVE" : "EXPIRED"
  }

  return {
    plan: subscription?.plan || "TRIAL",
    status: displayStatus,
    trial_starts_at: subscription?.trial_starts_at,
    trial_ends_at: subscription?.trial_ends_at,
    current_period_start: subscription?.current_period_start,
    current_period_end: subscription?.current_period_end,
    pricing: {
      monthly: Number(settingsRows[0]?.monthly_price || 499),
      yearly: Number(settingsRows[0]?.yearly_price || 4999),
    },
  }
}

export async function createRazorpayPaymentLinkAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  await ensureSubscriptionSchema()

  const plan = String(formData.get("plan") || "").toUpperCase()
  if (plan !== "MONTHLY" && plan !== "YEARLY") {
    redirect("/dashboard/settings/billing?error=Invalid%20plan")
  }

  const settingsRows = await sql`
    SELECT monthly_price, yearly_price
    FROM admin_settings
    WHERE id = 1
    LIMIT 1
  `

  const monthlyPrice = Number(settingsRows[0]?.monthly_price || 499)
  const yearlyPrice = Number(settingsRows[0]?.yearly_price || 4999)
  const amountRupees = plan === "MONTHLY" ? monthlyPrice : yearlyPrice
  const amountPaise = Math.round(amountRupees * 100)

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

  if (!razorpayKeyId || !razorpayKeySecret) {
    redirect("/dashboard/settings/billing?error=Razorpay%20is%20not%20configured")
  }

  const authHeader = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")
  const baseUrl = getBaseUrl()

  const payload = {
    amount: amountPaise,
    currency: "INR",
    accept_partial: false,
    description: `${plan} subscription upgrade`,
    customer: {
      name: session.user.name || "Customer",
      email: session.user.email || "",
      contact: "",
    },
    notify: { sms: false, email: true },
    reminder_enable: true,
    notes: {
      userId: session.user.id,
      businessId: session.user.businessId,
      plan,
    },
    callback_url: `${baseUrl}/dashboard/settings/billing?payment=success`,
    callback_method: "get",
  }

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error("Razorpay payment link error:", detail)
    redirect("/dashboard/settings/billing?error=Unable%20to%20start%20payment")
  }

  const data = (await response.json()) as { short_url?: string }
  if (!data.short_url) {
    redirect("/dashboard/settings/billing?error=Payment%20link%20not%20generated")
  }

  redirect(data.short_url)
}

export async function createTrialSubscriptionForUser(userId: string) {
  await ensureSubscriptionSchema()

  const now = new Date()
  const trialEnd = new Date(now)
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
      ${randomUUID()},
      ${userId},
      'TRIAL',
      'ACTIVE',
      ${now.toISOString()},
      ${trialEnd.toISOString()},
      ${now.toISOString()},
      ${trialEnd.toISOString()},
      'RAZORPAY'
    )
  `
}
