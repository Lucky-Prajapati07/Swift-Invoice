"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"

let adminSchemaReady = false

type AdminFeatureFlags = {
  invoicing: boolean
  transactions: boolean
  reports: boolean
  reminders: boolean
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function ensureAdminSchema() {
  if (adminSchemaReady) return

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE
  `

  await sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY,
      monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 499,
      yearly_price DECIMAL(10, 2) NOT NULL DEFAULT 4999,
      feature_flags JSONB NOT NULL DEFAULT '{"invoicing": true, "transactions": true, "reports": true, "reminders": true}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `

  await sql`
    INSERT INTO admin_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `

  adminSchemaReady = true
}

export async function getAdminDashboardData() {
  await requireAdmin()
  await ensureAdminSchema()

  const [summaryRows, planRows, monthlyRevenueRows, acquisitionRows] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE') AS active_subscriptions,
        (
          SELECT COALESCE(SUM(total_amount), 0)
          FROM invoices
          WHERE status <> 'CANCELLED'
            AND invoice_date >= date_trunc('month', NOW())
        ) AS revenue_monthly,
        (
          SELECT COALESCE(SUM(total_amount), 0)
          FROM invoices
          WHERE status <> 'CANCELLED'
            AND invoice_date >= date_trunc('year', NOW())
        ) AS revenue_yearly
    `,
    sql`
      SELECT
        COALESCE(SUM(CASE WHEN plan = 'TRIAL' THEN 1 ELSE 0 END), 0) AS trial_users,
        COALESCE(SUM(CASE WHEN plan IN ('MONTHLY', 'YEARLY') AND status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS paid_users
      FROM subscriptions
    `,
    sql`
      SELECT
        to_char(date_trunc('month', invoice_date), 'Mon YY') AS month,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM invoices
      WHERE invoice_date >= date_trunc('month', NOW()) - interval '11 months'
        AND status <> 'CANCELLED'
      GROUP BY 1
      ORDER BY min(date_trunc('month', invoice_date))
    `,
    sql`
      SELECT
        to_char(date_trunc('month', created_at), 'Mon YY') AS month,
        COUNT(*)::INT AS users
      FROM users
      WHERE created_at >= date_trunc('month', NOW()) - interval '11 months'
      GROUP BY 1
      ORDER BY min(date_trunc('month', created_at))
    `,
  ])

  const summary = summaryRows[0]
  const plans = planRows[0]

  return {
    totalUsers: toNumber(summary?.total_users),
    activeSubscriptions: toNumber(summary?.active_subscriptions),
    revenueMonthly: toNumber(summary?.revenue_monthly),
    revenueYearly: toNumber(summary?.revenue_yearly),
    trialUsers: toNumber(plans?.trial_users),
    paidUsers: toNumber(plans?.paid_users),
    monthlyRevenue: monthlyRevenueRows.map((row: any) => ({
      month: row.month,
      revenue: toNumber(row.revenue),
    })),
    userAcquisition: acquisitionRows.map((row: any) => ({
      month: row.month,
      users: toNumber(row.users),
    })),
  }
}

export async function getAdminUsers(search = "") {
  await requireAdmin()
  await ensureAdminSchema()

  const q = search.trim()
  const rows = await sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      COALESCE(u.is_blocked, FALSE) AS is_blocked,
      u.created_at,
      b.name AS business_name,
      s.plan,
      s.status AS subscription_status,
      s.trial_ends_at
    FROM users u
    LEFT JOIN businesses b ON b.user_id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE (
      ${q} = ''
      OR u.email ILIKE ${"%" + q + "%"}
      OR u.name ILIKE ${"%" + q + "%"}
      OR COALESCE(b.name, '') ILIKE ${"%" + q + "%"}
    )
    ORDER BY u.created_at DESC
  `

  return rows as Array<{
    id: string
    name: string
    email: string
    role: string
    is_blocked: boolean
    created_at: string
    business_name: string | null
    plan: string | null
    subscription_status: string | null
    trial_ends_at: string | null
  }>
}

export async function getAdminBusinesses(filter: "ALL" | "GST" | "NON_GST" = "ALL") {
  await requireAdmin()

  const rows = await sql`
    SELECT
      b.id,
      b.name,
      b.gst_number,
      b.city,
      b.state,
      b.created_at,
      u.email AS owner_email,
      u.name AS owner_name
    FROM businesses b
    INNER JOIN users u ON u.id = b.user_id
    WHERE (
      ${filter} = 'ALL'
      OR (${filter} = 'GST' AND COALESCE(b.gst_number, '') <> '')
      OR (${filter} = 'NON_GST' AND COALESCE(b.gst_number, '') = '')
    )
    ORDER BY b.created_at DESC
  `

  return rows as Array<{
    id: string
    name: string
    gst_number: string | null
    city: string | null
    state: string | null
    created_at: string
    owner_email: string
    owner_name: string
  }>
}

export async function getAdminSubscriptions(status: "ALL" | "TRIAL" | "ACTIVE" | "EXPIRED" = "ALL") {
  await requireAdmin()

  const rows = await sql`
    SELECT
      s.id,
      s.plan,
      s.status,
      s.trial_ends_at,
      s.current_period_start,
      s.current_period_end,
      s.created_at,
      u.name AS user_name,
      u.email AS user_email,
      b.name AS business_name
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    LEFT JOIN businesses b ON b.user_id = u.id
    WHERE (
      ${status} = 'ALL'
      OR (${status} = 'TRIAL' AND s.plan = 'TRIAL')
      OR (${status} = 'ACTIVE' AND s.status = 'ACTIVE')
      OR (${status} = 'EXPIRED' AND s.status = 'EXPIRED')
    )
    ORDER BY s.created_at DESC
  `

  return rows as Array<{
    id: string
    plan: string
    status: string
    trial_ends_at: string | null
    current_period_start: string | null
    current_period_end: string | null
    created_at: string
    user_name: string
    user_email: string
    business_name: string | null
  }>
}

export async function getAdminSettings() {
  await requireAdmin()
  await ensureAdminSchema()

  const rows = await sql`
    SELECT id, monthly_price, yearly_price, feature_flags, updated_at
    FROM admin_settings
    WHERE id = 1
    LIMIT 1
  `

  const row = rows[0] as {
    monthly_price: string | number
    yearly_price: string | number
    feature_flags: AdminFeatureFlags | null
    updated_at: string
  } | undefined

  return {
    monthly_price: toNumber(row?.monthly_price, 499),
    yearly_price: toNumber(row?.yearly_price, 4999),
    feature_flags: {
      invoicing: row?.feature_flags?.invoicing ?? true,
      transactions: row?.feature_flags?.transactions ?? true,
      reports: row?.feature_flags?.reports ?? true,
      reminders: row?.feature_flags?.reminders ?? true,
    },
    updated_at: row?.updated_at || null,
  }
}

export async function blockUserAction(formData: FormData) {
  await requireAdmin()
  await ensureAdminSchema()

  const userId = String(formData.get("userId") || "")
  const shouldBlock = String(formData.get("shouldBlock") || "true") === "true"

  if (!userId) return

  await sql`
    UPDATE users
    SET is_blocked = ${shouldBlock}, updated_at = NOW()
    WHERE id = ${userId} AND role <> 'ADMIN'
  `

  revalidatePath("/admin")
}

export async function deleteUserAction(formData: FormData) {
  await requireAdmin()

  const userId = String(formData.get("userId") || "")
  if (!userId) return

  await sql`
    DELETE FROM users
    WHERE id = ${userId} AND role <> 'ADMIN'
  `

  revalidatePath("/admin")
}

export async function sendBroadcastAction(formData: FormData) {
  await requireAdmin()

  const title = String(formData.get("title") || "").trim()
  const message = String(formData.get("message") || "").trim()
  if (!title || !message) return

  const users = await sql`SELECT id FROM users`

  for (const user of users as Array<{ id: string }>) {
    await sql`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, is_broadcast)
      VALUES (${randomUUID()}, ${user.id}, 'INFO', ${title}, ${message}, false, true)
    `
  }

  revalidatePath("/admin")
}

export async function sendTrialReminderAction() {
  await requireAdmin()

  const targets = await sql`
    SELECT s.user_id, u.name, s.trial_ends_at
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.plan = 'TRIAL'
      AND s.status = 'ACTIVE'
      AND s.trial_ends_at IS NOT NULL
      AND s.trial_ends_at <= NOW() + interval '5 days'
  `

  for (const row of targets as Array<{ user_id: string; name: string; trial_ends_at: string }>) {
    await sql`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, is_broadcast)
      VALUES (
        ${randomUUID()},
        ${row.user_id},
        'WARNING',
        'Trial ending soon',
        ${`Hi ${row.name}, your trial expires on ${new Date(row.trial_ends_at).toLocaleDateString("en-IN")}. Upgrade to continue uninterrupted access.`},
        false,
        true
      )
    `
  }

  revalidatePath("/admin")
}

export async function sendPaymentReminderAction() {
  await requireAdmin()

  const targets = await sql`
    SELECT s.user_id, u.name, s.current_period_end
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.plan IN ('MONTHLY', 'YEARLY')
      AND s.status = 'ACTIVE'
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end <= NOW() + interval '5 days'
  `

  for (const row of targets as Array<{ user_id: string; name: string; current_period_end: string }>) {
    await sql`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, is_broadcast)
      VALUES (
        ${randomUUID()},
        ${row.user_id},
        'INFO',
        'Payment reminder',
        ${`Hi ${row.name}, your plan renews on ${new Date(row.current_period_end).toLocaleDateString("en-IN")}. Please ensure payment is completed on time.`},
        false,
        true
      )
    `
  }

  revalidatePath("/admin")
}

export async function updateAdminSettingsAction(formData: FormData) {
  await requireAdmin()
  await ensureAdminSchema()

  const monthlyPrice = Math.max(0, toNumber(formData.get("monthlyPrice"), 499))
  const yearlyPrice = Math.max(0, toNumber(formData.get("yearlyPrice"), 4999))
  const features: AdminFeatureFlags = {
    invoicing: formData.get("feature_invoicing") === "on",
    transactions: formData.get("feature_transactions") === "on",
    reports: formData.get("feature_reports") === "on",
    reminders: formData.get("feature_reminders") === "on",
  }

  await sql`
    UPDATE admin_settings
    SET
      monthly_price = ${monthlyPrice},
      yearly_price = ${yearlyPrice},
      feature_flags = ${JSON.stringify(features)}::jsonb,
      updated_at = NOW()
    WHERE id = 1
  `

  revalidatePath("/admin")
}
