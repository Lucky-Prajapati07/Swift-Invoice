import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual, randomUUID } from "crypto"
import { sql } from "@/lib/db"

let webhookSchemaReady = false

type RazorpayWebhook = {
  event: string
  payload: {
    payment_link?: {
      entity?: {
        id?: string
        notes?: Record<string, string>
      }
    }
    payment?: {
      entity?: {
        id?: string
        customer_id?: string
        notes?: Record<string, string>
      }
    }
  }
}

function verifySignature(body: string, signature: string, secret: string) {
  const generated = createHmac("sha256", secret).update(body).digest("hex")
  const a = Buffer.from(generated)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function getPeriodEnd(plan: string, start: Date) {
  const end = new Date(start)
  if (plan === "YEARLY") {
    end.setFullYear(end.getFullYear() + 1)
  } else {
    end.setMonth(end.getMonth() + 1)
  }
  return end
}

async function ensureWebhookSchema() {
  if (webhookSchemaReady) return

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

  webhookSchemaReady = true
}

export async function POST(request: NextRequest) {
  await ensureWebhookSchema()

  const signature = request.headers.get("x-razorpay-signature") || ""
  const eventId = request.headers.get("x-razorpay-event-id") || randomUUID()
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const rawBody = await request.text()
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const data = JSON.parse(rawBody) as RazorpayWebhook

  const eventRows = await sql`
    SELECT id FROM razorpay_webhook_events WHERE event_id = ${eventId} LIMIT 1
  `
  if (eventRows[0]) {
    return NextResponse.json({ ok: true })
  }

  await sql`
    INSERT INTO razorpay_webhook_events (id, event_id, event_name, payload)
    VALUES (${randomUUID()}, ${eventId}, ${data.event}, ${JSON.stringify(data)}::jsonb)
  `

  if (data.event === "payment_link.paid" || data.event === "payment.captured") {
    const notes = data.payload.payment_link?.entity?.notes || data.payload.payment?.entity?.notes || {}
    const userId = notes.userId
    const plan = notes.plan === "YEARLY" ? "YEARLY" : "MONTHLY"

    if (userId) {
      const now = new Date()
      const periodEnd = getPeriodEnd(plan, now)
      const paymentId = data.payload.payment?.entity?.id || null
      const customerId = data.payload.payment?.entity?.customer_id || null
      const paymentLinkId = data.payload.payment_link?.entity?.id || null

      const existing = await sql`
        SELECT id FROM subscriptions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1
      `

      if (existing[0]) {
        await sql`
          UPDATE subscriptions
          SET
            plan = ${plan},
            status = 'ACTIVE',
            trial_ends_at = NULL,
            current_period_start = ${now.toISOString()},
            current_period_end = ${periodEnd.toISOString()},
            razorpay_subscription_id = COALESCE(${paymentLinkId}, razorpay_subscription_id),
            razorpay_customer_id = COALESCE(${customerId}, razorpay_customer_id),
            last_payment_id = ${paymentId},
            last_payment_at = NOW(),
            payment_provider = 'RAZORPAY',
            updated_at = NOW()
          WHERE id = ${existing[0].id}
        `
      } else {
        await sql`
          INSERT INTO subscriptions (
            id,
            user_id,
            plan,
            status,
            current_period_start,
            current_period_end,
            razorpay_subscription_id,
            razorpay_customer_id,
            last_payment_id,
            last_payment_at,
            payment_provider
          )
          VALUES (
            ${randomUUID()},
            ${userId},
            ${plan},
            'ACTIVE',
            ${now.toISOString()},
            ${periodEnd.toISOString()},
            ${paymentLinkId},
            ${customerId},
            ${paymentId},
            NOW(),
            'RAZORPAY'
          )
        `
      }

      await sql`
        INSERT INTO notifications (id, user_id, type, title, message, is_read, is_broadcast)
        VALUES (
          ${randomUUID()},
          ${userId},
          'SUCCESS',
          'Subscription upgraded',
          ${`Your ${plan} plan is now active. Thank you for your payment.`},
          false,
          true
        )
      `
    }
  }

  return NextResponse.json({ ok: true })
}
