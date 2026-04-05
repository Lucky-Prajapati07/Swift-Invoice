"use server"

import { sql } from "@/lib/db"
import { auth } from "@/lib/auth"
import type { InvoiceWithClient, DashboardStats } from "@/lib/types"

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const session = await auth()
  if (!session?.user?.businessId) return null

  const businessId = session.user.businessId

  try {
    // Get total revenue (sum of paid invoices)
    const revenueResult = await sql`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE business_id = ${businessId}
      AND status = 'PAID'
    `
    const totalRevenue = Number(revenueResult[0]?.total || 0)

    // Get total outstanding (invoice total minus linked income transactions)
    const outstandingResult = await sql`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN i.status <> 'CANCELLED' THEN GREATEST(i.total_amount - COALESCE(p.paid_amount, 0), 0)
              ELSE 0
            END
          ),
          0
        ) as total
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, COALESCE(SUM(amount), 0) AS paid_amount
        FROM transactions
        WHERE type = 'INCOME' AND invoice_id IS NOT NULL
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE i.business_id = ${businessId}
    `
    const totalOutstanding = Number(outstandingResult[0]?.total || 0)

    // Get total clients
    const clientsResult = await sql`
      SELECT COUNT(*) as count
      FROM clients
      WHERE business_id = ${businessId}
    `
    const totalClients = Number(clientsResult[0]?.count || 0)

    // Get total invoices
    const invoicesResult = await sql`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE business_id = ${businessId}
    `
    const totalInvoices = Number(invoicesResult[0]?.count || 0)

    // Get recent invoices with client info
    const recentInvoicesResult = await sql`
      SELECT 
        i.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.business_id = ${businessId}
      ORDER BY i.created_at DESC
      LIMIT 5
    `

    const recentInvoices: InvoiceWithClient[] = recentInvoicesResult.map((row) => ({
      id: row.id,
      business_id: row.business_id,
      client_id: row.client_id,
      invoice_number: row.invoice_number,
      issue_date: new Date(row.issue_date),
      due_date: new Date(row.due_date),
      status: row.status,
      subtotal: Number(row.subtotal),
      cgst_amount: Number(row.cgst_amount),
      sgst_amount: Number(row.sgst_amount),
      igst_amount: Number(row.igst_amount),
      total_amount: Number(row.total_amount),
      notes: row.notes,
      terms: row.terms,
      pdf_url: row.pdf_url,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      client: {
        id: row.client_id,
        business_id: row.business_id,
        name: row.client_name || "Unknown Client",
        email: row.client_email,
        phone: row.client_phone,
        address: null,
        city: null,
        state: null,
        pincode: null,
        gstin: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }))

    // Get monthly revenue for the last 6 months
    const monthlyRevenueResult = await sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE business_id = ${businessId}
      AND status = 'PAID'
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `

    const monthlyRevenue = monthlyRevenueResult.map((row) => ({
      month: row.month,
      revenue: Number(row.revenue),
    }))

    return {
      totalRevenue,
      totalOutstanding,
      totalClients,
      totalInvoices,
      recentInvoices,
      monthlyRevenue,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return null
  }
}

export async function getBusinessInfo() {
  const session = await auth()
  if (!session?.user?.businessId) return null

  const businessId = session.user.businessId

  try {
    const result = await sql`
      SELECT * FROM businesses WHERE id = ${businessId}
    `
    return result[0] || null
  } catch (error) {
    console.error("Error fetching business info:", error)
    return null
  }
}

export async function getSubscriptionInfo() {
  const session = await auth()
  if (!session?.user?.id) return null

  try {
    const result = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const row = result[0] as any
    if (!row) return null

    const now = new Date()
    const trialEnd = row.trial_ends_at ? new Date(row.trial_ends_at) : null
    const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null

    let status = row.status as string
    if (row.plan === "TRIAL" && row.status === "ACTIVE") {
      status = trialEnd && trialEnd > now ? "TRIALING" : "EXPIRED"
    } else if (row.plan !== "TRIAL" && row.status === "ACTIVE") {
      status = periodEnd && periodEnd > now ? "ACTIVE" : "EXPIRED"
    }

    return {
      ...row,
      status,
      current_period_end: row.plan === "TRIAL" ? row.trial_ends_at : row.current_period_end,
    }
  } catch (error) {
    console.error("Error fetching subscription info:", error)
    return null
  }
}
