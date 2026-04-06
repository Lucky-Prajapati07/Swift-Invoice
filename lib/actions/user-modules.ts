"use server"

import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type ClientType = "CUSTOMER" | "SUPPLIER"
type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED"
type TaxType = "CGST_SGST" | "IGST"

type InvoiceItemPayload = {
  name?: string
  itemName?: string
  hsnCode?: string
  quantity: number
  price: number
  discount?: number
  discountPercent?: number
  taxPercent?: number
  taxRate?: number
  amount?: number
}

type InvoiceDetailsPayload = {
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  documentTypeCode?: string
  documentDate?: string
  precedingInvoiceReference?: string
  precedingInvoiceDate?: string
  invoiceType?: string
  supplyTypeCode?: string
  isService?: string
  supplierLegalName?: string
  supplierAddress?: string
  supplierPlace?: string
  supplierStateCode?: string
  supplierPincode?: string
  party?: string
  partyGSTIN?: string
  recipientLegalName?: string
  recipientAddress?: string
  recipientStateCode?: string
  placeOfSupplyStateCode?: string
  recipientPincode?: string
  recipientPlace?: string
  irn?: string
  shippingToGSTIN?: string
  shippingToState?: string
  shippingToStateCode?: string
  shippingToPincode?: string
  dispatchFromName?: string
  dispatchFromAddress?: string
  dispatchFromPlace?: string
  dispatchFromPincode?: string
  eWayBill?: string
  transportMode?: string
  notes?: string
  status?: string
}

type BrandingPayload = {
  logoUrl?: string
  companyName?: string
  bankName?: string
  accountNumber?: string
  ifsc?: string
  branch?: string
  termsConditions?: string
}

let invoiceItemsSchemaReady = false
let businessSettingsSchemaReady = false
let clientExtendedSchemaReady = false
let invoiceDetailSchemaReady = false

export type ClientListItem = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  gst_number: string | null
  state_code: string | null
  client_type: ClientType
  total_business_value: number
  outstanding_balance: number
}

export type InvoiceListItem = {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  status: InvoiceStatus
  client_name: string
  total_amount: number
  share_token: string | null
}

export type TransactionListItem = {
  id: string
  type: "INCOME" | "EXPENSE"
  amount: number
  transaction_date: string
  payment_mode: "CASH" | "BANK" | "UPI" | "CARD" | "OTHER"
  description: string | null
  client_name: string | null
  invoice_number: string | null
}

async function getSessionContext() {
  const session = await auth()
  if (!session?.user?.businessId || !session.user.id) {
    throw new Error("Unauthorized")
  }
  return {
    businessId: session.user.businessId,
    userId: session.user.id,
    userEmail: session.user.email || "",
  }
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toNullableTrimmed(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function mapInvoiceStatus(value: unknown): InvoiceStatus {
  const normalized = String(value || "").trim().toUpperCase()
  if (normalized === "PAID") return "PAID"
  if (normalized === "OVERDUE") return "OVERDUE"
  if (normalized === "CANCELLED") return "CANCELLED"
  if (normalized === "DRAFT") return "DRAFT"
  if (normalized === "PENDING") return "SENT"
  return "SENT"
}

function toIsoDate(value: FormDataEntryValue | null, fallback = new Date()) {
  if (!value || typeof value !== "string") {
    return fallback.toISOString().slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback.toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

function toNullableIsoDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || !value.trim()) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toISOString().slice(0, 10)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function ensureInvoiceItemColumns() {
  if (invoiceItemsSchemaReady) return

  await sql`
    ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12, 2) DEFAULT 0
  `

  invoiceItemsSchemaReady = true
}

async function ensureBusinessSettingsColumns() {
  if (businessSettingsSchemaReady) return

  await sql`
    ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(150),
      ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255),
      ADD COLUMN IF NOT EXISTS signatory_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS signatory_mobile VARCHAR(20),
      ADD COLUMN IF NOT EXISTS signatory_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS signatory_designation VARCHAR(150),
      ADD COLUMN IF NOT EXISTS default_place_of_supply VARCHAR(120),
      ADD COLUMN IF NOT EXISTS default_reverse_charge VARCHAR(10) DEFAULT 'No',
      ADD COLUMN IF NOT EXISTS default_transporter_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS default_supply_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS default_document_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS default_is_service VARCHAR(10),
      ADD COLUMN IF NOT EXISTS default_transport_mode VARCHAR(50),
      ADD COLUMN IF NOT EXISTS default_terms TEXT
  `

  businessSettingsSchemaReady = true
}

async function ensureClientExtendedColumns() {
  if (clientExtendedSchemaReady) return

  await sql`
    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS state_code VARCHAR(10)
  `

  clientExtendedSchemaReady = true
}

async function ensureInvoiceDetailColumns() {
  if (invoiceDetailSchemaReady) return

  await sql`
    ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(120),
      ADD COLUMN IF NOT EXISTS reverse_charge VARCHAR(10) DEFAULT 'No',
      ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(500),
      ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS shipping_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS supply_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_service VARCHAR(10),
      ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50),
      ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(150),
        ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50),
        ADD COLUMN IF NOT EXISTS transporter_doc_no VARCHAR(100),
        ADD COLUMN IF NOT EXISTS transporter_doc_date DATE,
        ADD COLUMN IF NOT EXISTS eway_bill_no VARCHAR(100),
        ADD COLUMN IF NOT EXISTS eway_bill_date DATE,
        ADD COLUMN IF NOT EXISTS dispatch_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS dispatch_address VARCHAR(500),
        ADD COLUMN IF NOT EXISTS dispatch_pincode VARCHAR(10),
        ADD COLUMN IF NOT EXISTS preceding_inv_ref VARCHAR(100),
        ADD COLUMN IF NOT EXISTS preceding_inv_date DATE,
        ADD COLUMN IF NOT EXISTS ack_no VARCHAR(120),
        ADD COLUMN IF NOT EXISTS ack_date DATE,
          ADD COLUMN IF NOT EXISTS irn VARCHAR(64),
          ADD COLUMN IF NOT EXISTS document_date DATE,
          ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50),
          ADD COLUMN IF NOT EXISTS supplier_legal_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS supplier_address TEXT,
          ADD COLUMN IF NOT EXISTS supplier_place VARCHAR(120),
          ADD COLUMN IF NOT EXISTS supplier_state_code VARCHAR(10),
          ADD COLUMN IF NOT EXISTS supplier_pincode VARCHAR(12),
          ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS party_gstin VARCHAR(20),
          ADD COLUMN IF NOT EXISTS recipient_legal_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS recipient_address TEXT,
          ADD COLUMN IF NOT EXISTS recipient_state_code VARCHAR(10),
          ADD COLUMN IF NOT EXISTS recipient_pincode VARCHAR(12),
          ADD COLUMN IF NOT EXISTS recipient_place VARCHAR(120),
          ADD COLUMN IF NOT EXISTS place_of_supply_state_code VARCHAR(10),
          ADD COLUMN IF NOT EXISTS shipping_to_gstin VARCHAR(20),
          ADD COLUMN IF NOT EXISTS shipping_to_state VARCHAR(120),
          ADD COLUMN IF NOT EXISTS shipping_to_state_code VARCHAR(10),
          ADD COLUMN IF NOT EXISTS shipping_to_pincode VARCHAR(12),
          ADD COLUMN IF NOT EXISTS dispatch_from_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS dispatch_from_address TEXT,
          ADD COLUMN IF NOT EXISTS dispatch_from_place VARCHAR(120),
          ADD COLUMN IF NOT EXISTS dispatch_from_pincode VARCHAR(12),
          ADD COLUMN IF NOT EXISTS logo_url TEXT,
          ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150),
          ADD COLUMN IF NOT EXISTS account_number VARCHAR(60),
          ADD COLUMN IF NOT EXISTS ifsc VARCHAR(20),
          ADD COLUMN IF NOT EXISTS branch VARCHAR(150),
          ADD COLUMN IF NOT EXISTS terms_conditions TEXT
  `

  invoiceDetailSchemaReady = true
}



export async function getClients(params?: { search?: string; type?: string }) {
  const { businessId } = await getSessionContext()
  await ensureClientExtendedColumns()
  const search = params?.search?.trim() || ""
  const type = params?.type?.trim() || "ALL"

  const rows = await sql`
    SELECT
      c.id,
      c.name,
      c.email,
      c.phone,
      c.address,
      c.gst_number,
      c.state_code,
      c.client_type,
      COALESCE(SUM(CASE WHEN i.status <> 'CANCELLED' THEN i.total_amount ELSE 0 END), 0) AS total_business_value,
      COALESCE(
        SUM(
          CASE
            WHEN i.status <> 'CANCELLED' THEN GREATEST(i.total_amount - COALESCE(p.paid_amount, 0), 0)
            ELSE 0
          END
        ),
        0
      ) AS outstanding_balance
    FROM clients c
    LEFT JOIN invoices i ON i.client_id = c.id AND i.business_id = c.business_id
    LEFT JOIN (
      SELECT invoice_id, COALESCE(SUM(amount), 0) AS paid_amount
      FROM transactions
      WHERE type = 'INCOME' AND invoice_id IS NOT NULL
      GROUP BY invoice_id
    ) p ON p.invoice_id = i.id
    WHERE c.business_id = ${businessId}
      AND (
        ${search} = ''
        OR c.name ILIKE ${"%" + search + "%"}
        OR COALESCE(c.email, '') ILIKE ${"%" + search + "%"}
        OR COALESCE(c.phone, '') ILIKE ${"%" + search + "%"}
      )
      AND (${type} = 'ALL' OR c.client_type = ${type})
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    gst_number: row.gst_number,
    state_code: row.state_code,
    client_type: row.client_type,
    total_business_value: toNumber(row.total_business_value),
    outstanding_balance: toNumber(row.outstanding_balance),
  })) as ClientListItem[]
}

export async function getClientDetail(clientId: string) {
  const { businessId } = await getSessionContext()
  await ensureClientExtendedColumns()

  if (!isUuid(clientId)) {
    return null
  }

  const clientRows = await sql`
    SELECT *
    FROM clients
    WHERE id = ${clientId} AND business_id = ${businessId}
    LIMIT 1
  `

  if (!clientRows[0]) return null

  const invoices = await sql`
    SELECT id, invoice_number, invoice_date, due_date, status, total_amount
    FROM invoices
    WHERE business_id = ${businessId} AND client_id = ${clientId}
    ORDER BY invoice_date DESC
  `

  const totals = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN i.status <> 'CANCELLED' THEN i.total_amount ELSE 0 END), 0) AS total_business_value,
      COALESCE(
        SUM(
          CASE
            WHEN i.status <> 'CANCELLED' THEN GREATEST(i.total_amount - COALESCE(p.paid_amount, 0), 0)
            ELSE 0
          END
        ),
        0
      ) AS outstanding_balance
    FROM invoices i
    LEFT JOIN (
      SELECT invoice_id, COALESCE(SUM(amount), 0) AS paid_amount
      FROM transactions
      WHERE type = 'INCOME' AND invoice_id IS NOT NULL
      GROUP BY invoice_id
    ) p ON p.invoice_id = i.id
    WHERE i.business_id = ${businessId} AND i.client_id = ${clientId}
  `

  return {
    client: clientRows[0],
    invoices: invoices.map((row: any) => ({
      ...row,
      total_amount: toNumber(row.total_amount),
    })),
    totalBusinessValue: toNumber(totals[0]?.total_business_value),
    outstandingBalance: toNumber(totals[0]?.outstanding_balance),
  }
}

export async function saveClientAction(formData: FormData) {
  const { businessId } = await getSessionContext()
  await ensureClientExtendedColumns()

  const id = (formData.get("id") as string | null) || ""
  const name = (formData.get("name") as string | null)?.trim() || ""
  const email = (formData.get("email") as string | null)?.trim() || null
  const phone = (formData.get("phone") as string | null)?.trim() || null
  const address = (formData.get("address") as string | null)?.trim() || null
  const gstNumber = (formData.get("gstNumber") as string | null)?.trim() || null
  const stateCode = ((formData.get("stateCode") as string | null)?.trim().toUpperCase() || "").slice(0, 10) || null
  const clientType = ((formData.get("clientType") as string | null) || "CUSTOMER") as ClientType

  if (!name) {
    redirect("/dashboard/clients?error=Client%20name%20is%20required")
  }

  if (id) {
    await sql`
      UPDATE clients
      SET
        name = ${name},
        email = ${email},
        phone = ${phone},
        address = ${address},
        gst_number = ${gstNumber},
        state_code = ${stateCode},
        client_type = ${clientType},
        updated_at = NOW()
      WHERE id = ${id} AND business_id = ${businessId}
    `
  } else {
    await sql`
      INSERT INTO clients (
        id,
        business_id,
        name,
        email,
        phone,
        address,
        gst_number,
        state_code,
        client_type
      )
      VALUES (
        ${randomUUID()},
        ${businessId},
        ${name},
        ${email},
        ${phone},
        ${address},
        ${gstNumber},
        ${stateCode},
        ${clientType}
      )
    `
  }

  revalidatePath("/dashboard/clients")
  redirect("/dashboard/clients?success=Client%20saved")
}

export async function deleteClientAction(formData: FormData) {
  const { businessId } = await getSessionContext()
  const id = formData.get("id") as string

  await sql`DELETE FROM clients WHERE id = ${id} AND business_id = ${businessId}`

  revalidatePath("/dashboard/clients")
  redirect("/dashboard/clients?success=Client%20deleted")
}

export async function getClientsForSelect() {
  const { businessId } = await getSessionContext()
  await ensureClientExtendedColumns()
  const rows = await sql`
    SELECT id, name, client_type, gst_number, address, state_code, city, pincode, phone, email
    FROM clients
    WHERE business_id = ${businessId}
    ORDER BY name ASC
  `
  return rows as {
    id: string
    name: string
    client_type: ClientType
    gst_number: string | null
    address: string | null
    state_code: string | null
    city: string | null
    pincode: string | null
    phone: string | null
    email: string | null
  }[]
}

async function getNextInvoiceNumber(businessId: string) {
  const businessRows = await sql`
    SELECT invoice_prefix, invoice_next_number
    FROM businesses
    WHERE id = ${businessId}
    LIMIT 1
  `

  const business = businessRows[0]
  const prefix = business?.invoice_prefix || "INV"
  const next = toNumber(business?.invoice_next_number, 1)

  return `${prefix}-${String(next).padStart(4, "0")}`
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function parseInvoiceSequence(invoiceNumber: string, prefix: string) {
  const pattern = new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`, "i")
  const match = invoiceNumber.match(pattern)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

async function ensureUniqueInvoiceNumber(businessId: string, preferredNumber?: string | null, excludeInvoiceId?: string) {
  const businessRows = await sql`
    SELECT invoice_prefix, invoice_next_number
    FROM businesses
    WHERE id = ${businessId}
    LIMIT 1
  `

  const business = businessRows[0]
  const prefix = business?.invoice_prefix || "INV"
  let next = toNumber(business?.invoice_next_number, 1)
  const preferred = preferredNumber?.trim() || ""

  if (preferred) {
    const preferredExistsRows = excludeInvoiceId
      ? await sql`
          SELECT 1
          FROM invoices
          WHERE business_id = ${businessId}
            AND invoice_number = ${preferred}
            AND id <> ${excludeInvoiceId}
          LIMIT 1
        `
      : await sql`
          SELECT 1
          FROM invoices
          WHERE business_id = ${businessId}
            AND invoice_number = ${preferred}
          LIMIT 1
        `

    if (!preferredExistsRows[0]) {
      const preferredSequence = parseInvoiceSequence(preferred, prefix)
      return {
        invoiceNumber: preferred,
        nextInvoiceNumber: preferredSequence ? Math.max(next, preferredSequence + 1) : next + 1,
      }
    }
  }

  for (let attempts = 0; attempts < 5000; attempts += 1) {
    const candidate = `${prefix}-${String(next).padStart(4, "0")}`
    const candidateExistsRows = excludeInvoiceId
      ? await sql`
          SELECT 1
          FROM invoices
          WHERE business_id = ${businessId}
            AND invoice_number = ${candidate}
            AND id <> ${excludeInvoiceId}
          LIMIT 1
        `
      : await sql`
          SELECT 1
          FROM invoices
          WHERE business_id = ${businessId}
            AND invoice_number = ${candidate}
          LIMIT 1
        `

    if (!candidateExistsRows[0]) {
      return {
        invoiceNumber: candidate,
        nextInvoiceNumber: next + 1,
      }
    }

    next += 1
  }

  throw new Error("Unable to generate a unique invoice number")
}

export async function getInvoices(params?: { search?: string; status?: string; clientId?: string }) {
  const { businessId } = await getSessionContext()
  const search = params?.search?.trim() || ""
  const status = params?.status?.trim() || "ALL"
  const clientIdParam = params?.clientId?.trim() || ""
  const clientId = clientIdParam && clientIdParam !== "ALL" ? clientIdParam : null

  const rows = await sql`
    SELECT
      i.id,
      i.invoice_number,
      i.invoice_date,
      i.due_date,
      i.status,
      i.total_amount,
      i.share_token,
      c.name AS client_name
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    WHERE i.business_id = ${businessId}
      AND (${search} = '' OR i.invoice_number ILIKE ${"%" + search + "%"} OR c.name ILIKE ${"%" + search + "%"})
      AND (${status} = 'ALL' OR i.status = ${status})
      AND (${clientId}::uuid IS NULL OR i.client_id = ${clientId}::uuid)
    ORDER BY i.invoice_date DESC, i.created_at DESC
  `

  return rows.map((row: any) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    invoice_date: row.invoice_date,
    due_date: row.due_date,
    status: row.status,
    client_name: row.client_name,
    total_amount: toNumber(row.total_amount),
    share_token: row.share_token,
  })) as InvoiceListItem[]
}

export async function getInvoiceDetail(invoiceId: string) {
  const { businessId } = await getSessionContext()
  await ensureInvoiceItemColumns()
  await ensureInvoiceDetailColumns()
  await ensureBusinessSettingsColumns()

  if (!isUuid(invoiceId)) {
    return null
  }

  const rows = await sql`
    SELECT
      i.*,
      c.name AS client_name,
      c.email AS client_email,
      c.phone AS client_phone,
      c.address AS client_address,
      c.gst_number AS client_gst_number,
      b.name AS business_name,
      b.legal_name AS business_legal_name,
      b.display_name AS business_display_name,
      b.logo_url AS business_logo_url,
      b.address AS business_address,
      b.phone AS business_phone,
      b.email AS business_email,
      b.website_url AS business_website_url,
      b.gst_number AS business_gst_number,
      b.business_type AS business_type,
      b.bank_name,
      b.bank_account_number,
      b.bank_ifsc,
      b.bank_branch,
      b.bank_account_holder,
      b.signatory_name,
      b.signatory_mobile,
      b.signatory_email,
      b.signatory_designation,
      b.invoice_prefix
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    INNER JOIN businesses b ON b.id = i.business_id
    WHERE i.id = ${invoiceId} AND i.business_id = ${businessId}
    LIMIT 1
  `

  if (!rows[0]) return null

  const items = await sql`
    SELECT
      id,
      description,
      hsn_code,
      quantity,
      rate,
      discount_percent,
      discount_amount,
      tax_percent,
      tax_amount,
      amount
    FROM invoice_items
    WHERE invoice_id = ${invoiceId}
    ORDER BY sort_order ASC, created_at ASC
  `

  return {
    invoice: {
      ...rows[0],
      subtotal: toNumber(rows[0].subtotal),
      cgst_amount: toNumber(rows[0].cgst_amount),
      sgst_amount: toNumber(rows[0].sgst_amount),
      igst_amount: toNumber(rows[0].igst_amount),
      total_tax: toNumber(rows[0].total_tax),
      total_amount: toNumber(rows[0].total_amount),
      client_name: rows[0].client_name,
      client_email: rows[0].client_email,
      client_phone: rows[0].client_phone,
      client_address: rows[0].client_address,
      client_gst_number: rows[0].client_gst_number,
      business_phone: rows[0].business_phone,
      business_email: rows[0].business_email,
      business_website_url: rows[0].business_website_url,
      business_type: rows[0].business_type,
      business_legal_name: rows[0].business_legal_name,
      business_display_name: rows[0].business_display_name,
      business_logo_url: rows[0].business_logo_url,
      bank_name: rows[0].bank_name,
      bank_account_number: rows[0].bank_account_number,
      bank_ifsc: rows[0].bank_ifsc,
      bank_branch: rows[0].bank_branch,
      bank_account_holder: rows[0].bank_account_holder,
      signatory_name: rows[0].signatory_name,
      signatory_mobile: rows[0].signatory_mobile,
      signatory_email: rows[0].signatory_email,
      signatory_designation: rows[0].signatory_designation,
      shipping_name: rows[0].shipping_name,
      shipping_address: rows[0].shipping_address,
      shipping_phone: rows[0].shipping_phone,
      shipping_email: rows[0].shipping_email,
      transporter_name: rows[0].transporter_name,
      vehicle_no: rows[0].vehicle_no,
      place_of_supply: rows[0].place_of_supply,
      supply_type: rows[0].supply_type,
      document_type: rows[0].document_type,
      is_service: rows[0].is_service,
      transport_mode: rows[0].transport_mode,
      eway_bill_no: rows[0].eway_bill_no,
      eway_bill_date: rows[0].eway_bill_date,
      dispatch_name: rows[0].dispatch_name,
      dispatch_address: rows[0].dispatch_address,
      dispatch_pincode: rows[0].dispatch_pincode,
      preceding_inv_ref: rows[0].preceding_inv_ref,
      preceding_inv_date: rows[0].preceding_inv_date,
    },
    items: items.map((row: any) => ({
      ...row,
      quantity: toNumber(row.quantity),
      rate: toNumber(row.rate),
      discount_percent: toNumber(row.discount_percent),
      discount_amount: toNumber(row.discount_amount),
      tax_percent: toNumber(row.tax_percent),
      tax_amount: toNumber(row.tax_amount),
      amount: toNumber(row.amount),
    })),
  }
}

export async function getPublicInvoiceDetail(token: string) {
  await ensureInvoiceItemColumns()
  await ensureInvoiceDetailColumns()
  await ensureBusinessSettingsColumns()

  const rows = await sql`
    SELECT
      i.*,
      c.name AS client_name,
      c.email AS client_email,
      c.phone AS client_phone,
      b.name AS business_name,
      b.address AS business_address,
      b.gst_number AS business_gst_number
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    INNER JOIN businesses b ON b.id = i.business_id
    WHERE i.share_token = ${token}
    LIMIT 1
  `

  if (!rows[0]) return null

  const items = await sql`
    SELECT description, hsn_code, quantity, rate, discount_percent, discount_amount, tax_percent, tax_amount, amount
    FROM invoice_items
    WHERE invoice_id = ${rows[0].id}
    ORDER BY sort_order ASC, created_at ASC
  `

  return {
    invoice: {
      ...rows[0],
      subtotal: toNumber(rows[0].subtotal),
      total_amount: toNumber(rows[0].total_amount),
      total_tax: toNumber(rows[0].total_tax),
    },
    items: items.map((row: any) => ({
      ...row,
      quantity: toNumber(row.quantity),
      rate: toNumber(row.rate),
      discount_percent: toNumber(row.discount_percent),
      discount_amount: toNumber(row.discount_amount),
      tax_percent: toNumber(row.tax_percent),
      tax_amount: toNumber(row.tax_amount),
      amount: toNumber(row.amount),
    })),
  }
}

function calculateInvoiceTotals(items: InvoiceItemPayload[], taxType: TaxType) {
  const subtotal = items.reduce((sum, item) => {
    const lineBase = item.quantity * item.price
    const discountPercent = toNumber(item.discountPercent, 0)
    const discountAmount = (lineBase * discountPercent) / 100
    return sum + (lineBase - discountAmount)
  }, 0)

  const totalTax = items.reduce((sum, item) => {
    const lineBase = item.quantity * item.price
    const discountPercent = toNumber(item.discountPercent, 0)
    const taxPercent = toNumber(item.taxPercent, 0)
    const discountAmount = (lineBase * discountPercent) / 100
    const taxableValue = lineBase - discountAmount
    return sum + (taxableValue * taxPercent) / 100
  }, 0)

  const roundedSubtotal = Number(subtotal.toFixed(2))
  const roundedTax = Number(totalTax.toFixed(2))

  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0

  if (taxType === "CGST_SGST") {
    cgstAmount = Number((roundedTax / 2).toFixed(2))
    sgstAmount = Number((roundedTax / 2).toFixed(2))
  } else {
    igstAmount = roundedTax
  }

  return {
    subtotal: roundedSubtotal,
    totalTax: roundedTax,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount: Number((roundedSubtotal + roundedTax).toFixed(2)),
  }
}

export async function saveInvoiceAction(formData: FormData) {
  const { businessId, userId } = await getSessionContext()
  await ensureInvoiceItemColumns()
  await ensureInvoiceDetailColumns()
  await ensureBusinessSettingsColumns()

  const id = (formData.get("id") as string | null) || ""
  const clientId = (formData.get("clientId") as string | null) || ""
  const detailsPayloadRaw = (formData.get("detailsPayload") as string | null) || "{}"

  let detailsPayload: InvoiceDetailsPayload = {}

  try {
    detailsPayload = JSON.parse(detailsPayloadRaw) as InvoiceDetailsPayload
  } catch {
    redirect("/dashboard/invoices?error=Invalid%20invoice%20details%20payload")
  }

  const status = mapInvoiceStatus(detailsPayload.status || formData.get("status"))
  const taxTypeRaw = ((formData.get("taxType") as string | null) || "CGST_SGST").toUpperCase()
  const taxType: TaxType = taxTypeRaw === "IGST" ? "IGST" : "CGST_SGST"

  const invoiceDate = toIsoDate(detailsPayload.invoiceDate || formData.get("invoiceDate"))
  const dueDate = toIsoDate(detailsPayload.dueDate || formData.get("dueDate"), new Date(invoiceDate))

  const placeOfSupply = toNullableTrimmed(
    detailsPayload.placeOfSupplyStateCode || detailsPayload.recipientStateCode || formData.get("placeOfSupply"),
  )
  const reverseCharge = ((formData.get("reverseCharge") as string | null)?.trim() || "No") === "Yes" ? "Yes" : "No"

  const shippingName = toNullableTrimmed(formData.get("shippingName"))
  const shippingAddress = toNullableTrimmed(formData.get("shippingAddress"))
  const shippingPhone = toNullableTrimmed(formData.get("shippingPhone"))
  const shippingEmail = toNullableTrimmed(formData.get("shippingEmail"))

  const transportMode = toNullableTrimmed(detailsPayload.transportMode || formData.get("transportMode"))

  const dispatchName = toNullableTrimmed(detailsPayload.dispatchFromName || formData.get("dispatchName"))
  const dispatchPincode = toNullableTrimmed(detailsPayload.dispatchFromPincode || formData.get("dispatchPincode"))

  const notes = toNullableTrimmed(detailsPayload.notes || formData.get("notes"))
  const terms = toNullableTrimmed(formData.get("terms"))

  const invoiceNumberInput = toNullableTrimmed(detailsPayload.invoiceNumber || formData.get("invoiceNumber"))

  const partyName = toNullableTrimmed(detailsPayload.party)
  const partyGstin = toNullableTrimmed(detailsPayload.partyGSTIN)
  const recipientLegalName = toNullableTrimmed(detailsPayload.recipientLegalName)
  const recipientAddress = toNullableTrimmed(detailsPayload.recipientAddress)
  const recipientStateCode = toNullableTrimmed(detailsPayload.recipientStateCode)
  const placeOfSupplyStateCode = toNullableTrimmed(detailsPayload.placeOfSupplyStateCode)
  const recipientPincode = toNullableTrimmed(detailsPayload.recipientPincode)
  const recipientPlace = toNullableTrimmed(detailsPayload.recipientPlace)
  const shippingToGstin = toNullableTrimmed(detailsPayload.shippingToGSTIN)
  const shippingToState = toNullableTrimmed(detailsPayload.shippingToState)
  const shippingToStateCode = toNullableTrimmed(detailsPayload.shippingToStateCode)
  const shippingToPincode = toNullableTrimmed(detailsPayload.shippingToPincode)

  const dispatchFromName = toNullableTrimmed(detailsPayload.dispatchFromName)
  const dispatchFromPlace = toNullableTrimmed(detailsPayload.dispatchFromPlace)
  const dispatchFromPincode = toNullableTrimmed(detailsPayload.dispatchFromPincode)

  if (!clientId) {
    redirect("/dashboard/invoices?error=Client%20is%20required")
  }

  const businessRows = await sql`
    SELECT
      legal_name,
      display_name,
      name,
      logo_url,
      bank_name,
      bank_account_number,
      bank_ifsc,
      bank_branch,
      default_terms
    FROM businesses
    WHERE id = ${businessId}
    LIMIT 1
  `

  const business = businessRows[0] as
    | {
        legal_name: string | null
        display_name: string | null
        name: string | null
        logo_url: string | null
        bank_name: string | null
        bank_account_number: string | null
        bank_ifsc: string | null
        bank_branch: string | null
        default_terms: string | null
      }
    | undefined

  const logoUrl = toNullableTrimmed(business?.logo_url || null)
  const companyName = toNullableTrimmed(business?.display_name || business?.legal_name || business?.name || null)
  const bankName = toNullableTrimmed(business?.bank_name || null)
  const accountNumber = toNullableTrimmed(business?.bank_account_number || null)
  const ifsc = toNullableTrimmed(business?.bank_ifsc || null)
  const branch = toNullableTrimmed(business?.bank_branch || null)
  const finalTerms = terms || toNullableTrimmed(business?.default_terms || null)

  const itemsPayloadRaw = (formData.get("itemsPayload") as string | null) || "[]"

  let itemsPayload: InvoiceItemPayload[] = []
  try {
    const parsed = JSON.parse(itemsPayloadRaw) as InvoiceItemPayload[]
    itemsPayload = parsed.map((item) => ({
      ...item,
      name: item.name || item.itemName || "",
      discountPercent: toNumber(item.discountPercent ?? item.discount, 0),
      taxPercent: toNumber(item.taxPercent ?? item.taxRate, 0),
    }))
  } catch {
    redirect("/dashboard/invoices?error=Invalid%20items%20payload")
  }

  const validItems = itemsPayload.filter(
    (item) => item.name?.trim() && toNumber(item.quantity) > 0 && toNumber(item.price) >= 0,
  )

  if (validItems.length === 0) {
    redirect("/dashboard/invoices?error=At%20least%20one%20item%20is%20required")
  }

  const totals = calculateInvoiceTotals(validItems, taxType)
  let createdInvoiceId: string | null = null
  let invoiceNumber = invoiceNumberInput || ""
  let nextInvoiceNumber = 0
  let existingInvoiceNumber = ""

  if (id) {
    const existingRows = await sql`
      SELECT invoice_number
      FROM invoices
      WHERE id = ${id} AND business_id = ${businessId}
      LIMIT 1
    `
    existingInvoiceNumber = existingRows[0]?.invoice_number || ""
  }

  if (!id) {
    const subscriptionRows = await sql`
      SELECT plan, status, trial_ends_at, current_period_end
      FROM subscriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const subscription = subscriptionRows[0] as {
      plan: string
      status: string
      trial_ends_at: string | null
      current_period_end: string | null
    } | undefined

    const now = new Date()
    const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null
    const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null

    const isExpired = !subscription
      || subscription.status === "CANCELLED"
      || subscription.status === "EXPIRED"
      || (subscription.plan === "TRIAL" && (!trialEnd || trialEnd <= now))
      || (subscription.plan !== "TRIAL" && (!periodEnd || periodEnd <= now))

    if (isExpired) {
      redirect("/dashboard/invoices?error=Subscription%20expired.%20Please%20upgrade%20to%20create%20new%20invoices")
    }

    const resolvedInvoice = await ensureUniqueInvoiceNumber(businessId, invoiceNumber || null)
    invoiceNumber = resolvedInvoice.invoiceNumber
    nextInvoiceNumber = resolvedInvoice.nextInvoiceNumber
  } else {
    const resolvedInvoice = await ensureUniqueInvoiceNumber(
      businessId,
      invoiceNumber || existingInvoiceNumber || null,
      id,
    )
    invoiceNumber = resolvedInvoice.invoiceNumber
  }

  if (id) {
    await sql`
      UPDATE invoices
      SET
        client_id = ${clientId},
        invoice_number = ${invoiceNumber},
        invoice_date = ${invoiceDate},
        due_date = ${dueDate},
        status = ${status},
        subtotal = ${totals.subtotal},
        tax_type = ${taxType},
        place_of_supply = ${placeOfSupply},
        reverse_charge = ${reverseCharge},
        supply_type = NULL,
        document_type = NULL,
        is_service = NULL,
        cgst_amount = ${totals.cgstAmount},
        sgst_amount = ${totals.sgstAmount},
        igst_amount = ${totals.igstAmount},
        total_tax = ${totals.totalTax},
        total_amount = ${totals.totalAmount},
        shipping_name = ${shippingName},
        shipping_address = ${shippingAddress},
        shipping_phone = ${shippingPhone},
        shipping_email = ${shippingEmail},
        transport_mode = ${transportMode},
        transporter_name = NULL,
        vehicle_no = NULL,
        eway_bill_no = NULL,
        eway_bill_date = NULL,
        dispatch_name = ${dispatchName},
        dispatch_address = NULL,
        dispatch_pincode = ${dispatchPincode},
        preceding_inv_ref = NULL,
        preceding_inv_date = NULL,
        irn = NULL,
        ack_no = NULL,
        ack_date = NULL,
        document_date = NULL,
        invoice_type = NULL,
        supplier_legal_name = ${recipientLegalName},
        supplier_address = ${recipientAddress},
        supplier_place = ${recipientPlace},
        supplier_state_code = ${recipientStateCode},
        supplier_pincode = ${recipientPincode},
        party_name = ${partyName},
        party_gstin = ${partyGstin},
        recipient_legal_name = ${recipientLegalName},
        recipient_address = ${recipientAddress},
        recipient_state_code = ${recipientStateCode},
        place_of_supply_state_code = ${placeOfSupplyStateCode},
        recipient_pincode = ${recipientPincode},
        recipient_place = ${recipientPlace},
        shipping_to_gstin = ${shippingToGstin},
        shipping_to_state = ${shippingToState},
        shipping_to_state_code = ${shippingToStateCode},
        shipping_to_pincode = ${shippingToPincode},
        dispatch_from_name = ${dispatchFromName},
        dispatch_from_address = NULL,
        dispatch_from_place = ${dispatchFromPlace},
        dispatch_from_pincode = ${dispatchFromPincode},
        logo_url = ${logoUrl},
        company_name = ${companyName},
        bank_name = ${bankName},
        account_number = ${accountNumber},
        ifsc = ${ifsc},
        branch = ${branch},
        terms_conditions = ${finalTerms},
        notes = ${notes},
        terms = ${finalTerms},
        updated_at = NOW()
      WHERE id = ${id} AND business_id = ${businessId}
    `

    await sql`DELETE FROM invoice_items WHERE invoice_id = ${id}`

    for (const [index, item] of validItems.entries()) {
      const lineBase = Number((item.quantity * item.price).toFixed(2))
      const discountPercent = Number(toNumber(item.discountPercent, 0).toFixed(2))
      const taxPercent = Number(toNumber(item.taxPercent, 0).toFixed(2))
      const discountAmount = Number(((lineBase * discountPercent) / 100).toFixed(2))
      const taxableValue = Number((lineBase - discountAmount).toFixed(2))
      const lineTax = Number(((taxableValue * taxPercent) / 100).toFixed(2))
      const lineTotal = Number((taxableValue + lineTax).toFixed(2))

      await sql`
        INSERT INTO invoice_items (
          id,
          invoice_id,
          description,
          hsn_code,
          quantity,
          rate,
          discount_percent,
          discount_amount,
          tax_percent,
          tax_amount,
          amount,
          sort_order
        )
        VALUES (
          ${randomUUID()},
          ${id},
          ${(item.name || "").trim()},
          ${(item.hsnCode || "").trim() || null},
          ${item.quantity},
          ${item.price},
          ${discountPercent},
          ${discountAmount},
          ${taxPercent},
          ${lineTax},
          ${lineTotal},
          ${index}
        )
      `
    }
  } else {
    const invoiceId = randomUUID()
    createdInvoiceId = invoiceId

    await sql`
      INSERT INTO invoices (
        id,
        business_id,
        client_id,
        invoice_number,
        invoice_date,
        due_date,
        status,
        subtotal,
        tax_type,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_tax,
        total_amount,
        place_of_supply,
        reverse_charge,
        supply_type,
        document_type,
        is_service,
        shipping_name,
        shipping_address,
        shipping_phone,
        shipping_email,
        transport_mode,
        transporter_name,
        vehicle_no,
        eway_bill_no,
        eway_bill_date,
        dispatch_name,
        dispatch_address,
        dispatch_pincode,
        preceding_inv_ref,
        preceding_inv_date,
        irn,
        ack_no,
        ack_date,
        document_date,
        invoice_type,
        supplier_legal_name,
        supplier_address,
        supplier_place,
        supplier_state_code,
        supplier_pincode,
        party_name,
        party_gstin,
        recipient_legal_name,
        recipient_address,
        recipient_state_code,
        place_of_supply_state_code,
        recipient_pincode,
        recipient_place,
        shipping_to_gstin,
        shipping_to_state,
        shipping_to_state_code,
        shipping_to_pincode,
        dispatch_from_name,
        dispatch_from_address,
        dispatch_from_place,
        dispatch_from_pincode,
        logo_url,
        company_name,
        bank_name,
        account_number,
        ifsc,
        branch,
        terms_conditions,
        notes,
        terms,
        share_token
      )
      VALUES (
        ${invoiceId},
        ${businessId},
        ${clientId},
        ${invoiceNumber},
        ${invoiceDate},
        ${dueDate},
        ${status},
        ${totals.subtotal},
        ${taxType},
        ${totals.cgstAmount},
        ${totals.sgstAmount},
        ${totals.igstAmount},
        ${totals.totalTax},
        ${totals.totalAmount},
        ${placeOfSupply},
        ${reverseCharge},
        ${null},
        ${null},
        ${null},
        ${shippingName},
        ${shippingAddress},
        ${shippingPhone},
        ${shippingEmail},
        ${transportMode},
        ${null},
        ${null},
        ${null},
        ${null},
        ${dispatchName},
        ${null},
        ${dispatchPincode},
        ${null},
        ${null},
        ${null},
        ${null},
        ${null},
        ${null},
        ${null},
        ${recipientLegalName},
        ${recipientAddress},
        ${recipientPlace},
        ${recipientStateCode},
        ${recipientPincode},
        ${partyName},
        ${partyGstin},
        ${recipientLegalName},
        ${recipientAddress},
        ${recipientStateCode},
        ${placeOfSupplyStateCode},
        ${recipientPincode},
        ${recipientPlace},
        ${shippingToGstin},
        ${shippingToState},
        ${shippingToStateCode},
        ${shippingToPincode},
        ${dispatchFromName},
        ${null},
        ${dispatchFromPlace},
        ${dispatchFromPincode},
        ${logoUrl},
        ${companyName},
        ${bankName},
        ${accountNumber},
        ${ifsc},
        ${branch},
        ${finalTerms},
        ${notes},
        ${finalTerms},
        ${randomUUID().replaceAll("-", "")}
      )
    `

    for (const [index, item] of validItems.entries()) {
      const lineBase = Number((item.quantity * item.price).toFixed(2))
      const discountPercent = Number(toNumber(item.discountPercent, 0).toFixed(2))
      const taxPercent = Number(toNumber(item.taxPercent, 0).toFixed(2))
      const discountAmount = Number(((lineBase * discountPercent) / 100).toFixed(2))
      const taxableValue = Number((lineBase - discountAmount).toFixed(2))
      const lineTax = Number(((taxableValue * taxPercent) / 100).toFixed(2))
      const lineTotal = Number((taxableValue + lineTax).toFixed(2))

      await sql`
        INSERT INTO invoice_items (
          id,
          invoice_id,
          description,
          hsn_code,
          quantity,
          rate,
          discount_percent,
          discount_amount,
          tax_percent,
          tax_amount,
          amount,
          sort_order
        )
        VALUES (
          ${randomUUID()},
          ${invoiceId},
          ${(item.name || "").trim()},
          ${(item.hsnCode || "").trim() || null},
          ${item.quantity},
          ${item.price},
          ${discountPercent},
          ${discountAmount},
          ${taxPercent},
          ${lineTax},
          ${lineTotal},
          ${index}
        )
      `
    }

    await sql`
      UPDATE businesses
      SET invoice_next_number = ${nextInvoiceNumber}, updated_at = NOW()
      WHERE id = ${businessId}
    `
  }

  revalidatePath("/dashboard/invoices")
  if (createdInvoiceId) {
    revalidatePath(`/dashboard/invoices/${createdInvoiceId}`)
  }
  redirect("/dashboard/invoices?success=Invoice%20saved")
}

export async function deleteInvoiceAction(formData: FormData) {
  const { businessId } = await getSessionContext()
  const id = formData.get("id") as string

  await sql`DELETE FROM invoices WHERE id = ${id} AND business_id = ${businessId}`

  revalidatePath("/dashboard/invoices")
  redirect("/dashboard/invoices?success=Invoice%20deleted")
}

export async function markInvoicePaidAction(formData: FormData) {
  const { businessId } = await getSessionContext()
  const id = formData.get("id") as string

  await sql`
    UPDATE invoices
    SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND business_id = ${businessId}
  `

  revalidatePath("/dashboard/invoices")
  revalidatePath(`/dashboard/invoices/${id}`)
  redirect("/dashboard/invoices?success=Invoice%20marked%20as%20paid")
}

export async function getTransactions(params?: { search?: string; type?: string; clientId?: string }) {
  const { businessId } = await getSessionContext()

  const search = params?.search?.trim() || ""
  const type = params?.type?.trim() || "ALL"
  const clientIdParam = params?.clientId?.trim() || ""
  const clientId = clientIdParam && clientIdParam !== "ALL" ? clientIdParam : null

  const rows = await sql`
    SELECT
      t.id,
      t.type,
      t.amount,
      t.transaction_date,
      t.payment_mode,
      t.description,
      c.name AS client_name,
      i.invoice_number
    FROM transactions t
    LEFT JOIN clients c ON c.id = t.client_id
    LEFT JOIN invoices i ON i.id = t.invoice_id
    WHERE t.business_id = ${businessId}
      AND (${search} = '' OR COALESCE(t.description, '') ILIKE ${"%" + search + "%"} OR COALESCE(c.name, '') ILIKE ${"%" + search + "%"})
      AND (${type} = 'ALL' OR t.type = ${type})
      AND (${clientId}::uuid IS NULL OR t.client_id = ${clientId}::uuid)
    ORDER BY t.transaction_date DESC, t.created_at DESC
  `

  return rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    amount: toNumber(row.amount),
    transaction_date: row.transaction_date,
    payment_mode: row.payment_mode,
    description: row.description,
    client_name: row.client_name,
    invoice_number: row.invoice_number,
  })) as TransactionListItem[]
}

export async function saveTransactionAction(formData: FormData) {
  const { businessId } = await getSessionContext()

  const type = ((formData.get("type") as string | null) || "INCOME") as "INCOME" | "EXPENSE"
  const amount = toNumber(formData.get("amount"), 0)
  const transactionDate = toIsoDate(formData.get("transactionDate"))
  const paymentMode = ((formData.get("paymentMode") as string | null) || "CASH") as "CASH" | "BANK" | "UPI" | "CARD" | "OTHER"
  const clientIdRaw = (formData.get("clientId") as string | null) || ""
  const invoiceIdRaw = (formData.get("invoiceId") as string | null) || ""
  const description = (formData.get("description") as string | null)?.trim() || null

  if (amount <= 0) {
    redirect("/dashboard/transactions?error=Amount%20must%20be%20greater%20than%200")
  }

  let clientId = clientIdRaw || null
  let invoiceId = invoiceIdRaw || null

  if (invoiceId && !isUuid(invoiceId)) {
    redirect("/dashboard/transactions?error=Invalid%20invoice%20reference")
  }

  if (clientId && !isUuid(clientId)) {
    redirect("/dashboard/transactions?error=Invalid%20client%20reference")
  }

  if (invoiceId) {
    const invoiceRows = await sql`
      SELECT id, client_id, total_amount, due_date, status
      FROM invoices
      WHERE id = ${invoiceId} AND business_id = ${businessId}
      LIMIT 1
    `

    const invoice = invoiceRows[0]
    if (!invoice) {
      redirect("/dashboard/transactions?error=Linked%20invoice%20not%20found")
    }

    if (!clientId && invoice.client_id) {
      clientId = invoice.client_id
    }
  }

  await sql`
    INSERT INTO transactions (
      id,
      business_id,
      client_id,
      invoice_id,
      type,
      amount,
      payment_mode,
      description,
      transaction_date
    )
    VALUES (
      ${randomUUID()},
      ${businessId},
      ${clientId},
      ${invoiceId},
      ${type},
      ${amount},
      ${paymentMode},
      ${description},
      ${transactionDate}
    )
  `

  if (type === "INCOME" && invoiceId) {
    const paymentRows = await sql`
      SELECT COALESCE(SUM(amount), 0) AS paid_amount
      FROM transactions
      WHERE business_id = ${businessId}
        AND invoice_id = ${invoiceId}
        AND type = 'INCOME'
    `

    const invoiceRows = await sql`
      SELECT total_amount, due_date
      FROM invoices
      WHERE id = ${invoiceId} AND business_id = ${businessId}
      LIMIT 1
    `

    const invoice = invoiceRows[0]
    if (invoice) {
      const paidAmount = toNumber(paymentRows[0]?.paid_amount)
      const outstanding = Math.max(toNumber(invoice.total_amount) - paidAmount, 0)

      if (outstanding <= 0) {
        await sql`
          UPDATE invoices
          SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
          WHERE id = ${invoiceId} AND business_id = ${businessId}
        `
      } else {
        const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
        const now = new Date()
        const status: InvoiceStatus = dueDate && dueDate < now ? "OVERDUE" : "SENT"

        await sql`
          UPDATE invoices
          SET status = ${status}, paid_at = NULL, updated_at = NOW()
          WHERE id = ${invoiceId} AND business_id = ${businessId} AND status <> 'CANCELLED'
        `
      }
    }
  }

  revalidatePath("/dashboard/transactions")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/clients")
  revalidatePath("/dashboard/invoices")
  if (invoiceId) {
    revalidatePath(`/dashboard/invoices/${invoiceId}`)
  }
  redirect("/dashboard/transactions?success=Transaction%20saved")
}

export async function deleteTransactionAction(formData: FormData) {
  const { businessId } = await getSessionContext()
  const id = formData.get("id") as string

  await sql`DELETE FROM transactions WHERE id = ${id} AND business_id = ${businessId}`

  revalidatePath("/dashboard/transactions")
  redirect("/dashboard/transactions?success=Transaction%20deleted")
}

export async function getReportData(params?: {
  from?: string
  to?: string
  clientId?: string
  status?: string
}) {
  const { businessId } = await getSessionContext()

  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)

  const from = params?.from || defaultFrom.toISOString().slice(0, 10)
  const to = params?.to || today.toISOString().slice(0, 10)
  const clientIdParam = params?.clientId?.trim() || ""
  const clientId = clientIdParam && clientIdParam !== "ALL" ? clientIdParam : null
  const status = params?.status || "ALL"

  const sales = await sql`
    SELECT COALESCE(SUM(total_amount), 0) AS total
    FROM invoices
    WHERE business_id = ${businessId}
      AND invoice_date BETWEEN ${from} AND ${to}
      AND (${clientId}::uuid IS NULL OR client_id = ${clientId}::uuid)
      AND (${status} = 'ALL' OR status = ${status})
      AND status IN ('SENT', 'PAID', 'OVERDUE')
  `

  const purchase = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE business_id = ${businessId}
      AND transaction_date BETWEEN ${from} AND ${to}
      AND type = 'EXPENSE'
      AND (${clientId}::uuid IS NULL OR client_id = ${clientId}::uuid)
  `

  const gstSummary = await sql`
    SELECT
      COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) AS total_tax_collected,
      COALESCE(SUM(cgst_amount), 0) AS total_cgst,
      COALESCE(SUM(sgst_amount), 0) AS total_sgst,
      COALESCE(SUM(igst_amount), 0) AS total_igst
    FROM invoices
    WHERE business_id = ${businessId}
      AND invoice_date BETWEEN ${from} AND ${to}
      AND status IN ('SENT', 'PAID', 'OVERDUE')
      AND (${clientId}::uuid IS NULL OR client_id = ${clientId}::uuid)
      AND (${status} = 'ALL' OR status = ${status})
  `

  const clientWise = await sql`
    SELECT
      c.id,
      c.name,
      COALESCE(SUM(i.total_amount), 0) AS total,
      COUNT(i.id) AS invoice_count
    FROM clients c
    LEFT JOIN invoices i ON i.client_id = c.id
      AND i.invoice_date BETWEEN ${from} AND ${to}
      AND (${status} = 'ALL' OR i.status = ${status})
    WHERE c.business_id = ${businessId}
      AND (${clientId}::uuid IS NULL OR c.id = ${clientId}::uuid)
    GROUP BY c.id
    ORDER BY total DESC
  `

  const salesTotal = toNumber(sales[0]?.total)
  const purchaseTotal = toNumber(purchase[0]?.total)

  return {
    filters: { from, to, clientId, status },
    salesTotal,
    purchaseTotal,
    profitLoss: Number((salesTotal - purchaseTotal).toFixed(2)),
    gst: {
      totalTaxCollected: toNumber(gstSummary[0]?.total_tax_collected),
      totalCgst: toNumber(gstSummary[0]?.total_cgst),
      totalSgst: toNumber(gstSummary[0]?.total_sgst),
      totalIgst: toNumber(gstSummary[0]?.total_igst),
    },
    clientWise: clientWise.map((row: any) => ({
      id: row.id,
      name: row.name,
      total: toNumber(row.total),
      invoiceCount: toNumber(row.invoice_count),
    })),
  }
}

export async function getInvoiceExportRows(params?: {
  from?: string
  to?: string
  clientId?: string
  status?: string
}) {
  const { businessId } = await getSessionContext()

  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)

  const from = params?.from || defaultFrom.toISOString().slice(0, 10)
  const to = params?.to || today.toISOString().slice(0, 10)
  const clientIdParam = params?.clientId?.trim() || ""
  const clientId = clientIdParam && clientIdParam !== "ALL" ? clientIdParam : null
  const status = params?.status || "ALL"

  const rows = await sql`
    SELECT
      i.invoice_number,
      i.invoice_date,
      i.due_date,
      i.status,
      c.name AS client_name,
      i.subtotal,
      i.total_tax,
      i.total_amount
    FROM invoices i
    INNER JOIN clients c ON c.id = i.client_id
    WHERE i.business_id = ${businessId}
      AND i.invoice_date BETWEEN ${from} AND ${to}
      AND (${clientId}::uuid IS NULL OR i.client_id = ${clientId}::uuid)
      AND (${status} = 'ALL' OR i.status = ${status})
    ORDER BY i.invoice_date DESC
  `

  return rows.map((row: any) => ({
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    status: row.status,
    client: row.client_name,
    subtotal: toNumber(row.subtotal),
    tax: toNumber(row.total_tax),
    total: toNumber(row.total_amount),
  }))
}

export async function getSettingsData() {
  const { businessId, userId, userEmail } = await getSessionContext()
  await ensureBusinessSettingsColumns()

  const businessRows = await sql`
    SELECT
      id,
      name,
      legal_name,
      display_name,
      business_type,
      website_url,
      address,
      phone,
      email,
      gst_number,
      logo_url,
      bank_account_number,
      bank_ifsc,
      bank_name,
      bank_branch,
      bank_account_holder,
      signatory_name,
      signatory_mobile,
      signatory_email,
      signatory_designation,
      default_place_of_supply,
      default_reverse_charge,
      default_transporter_name,
      default_supply_type,
      default_document_type,
      default_is_service,
      default_transport_mode,
      default_terms,
      invoice_prefix,
      invoice_next_number
    FROM businesses
    WHERE id = ${businessId}
    LIMIT 1
  `

  const userRows = await sql`
    SELECT id, name, email
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `

  return {
    business: businessRows[0] || null,
    account: userRows[0] || { id: userId, name: "", email: userEmail },
  }
}

export async function updateBusinessSettingsAction(formData: FormData) {
  const { businessId } = await getSessionContext()
  await ensureBusinessSettingsColumns()

  const businessName = (formData.get("businessName") as string | null)?.trim() || ""
  const legalName = (formData.get("legalName") as string | null)?.trim() || null
  const displayName = (formData.get("displayName") as string | null)?.trim() || null
  const businessType = (formData.get("businessType") as string | null)?.trim() || null
  const websiteUrl = (formData.get("websiteUrl") as string | null)?.trim() || null
  const address = (formData.get("address") as string | null)?.trim() || null
  const phone = (formData.get("phone") as string | null)?.trim() || null
  const email = (formData.get("email") as string | null)?.trim() || null
  const gstNumber = (formData.get("gstNumber") as string | null)?.trim() || null
  const logoUrl = (formData.get("logoUrl") as string | null)?.trim() || null
  const bankAccountNumber = (formData.get("bankAccountNumber") as string | null)?.trim() || null
  const bankIfsc = (formData.get("bankIfsc") as string | null)?.trim().toUpperCase() || null
  const bankName = (formData.get("bankName") as string | null)?.trim() || null
  const bankBranch = (formData.get("bankBranch") as string | null)?.trim() || null
  const bankAccountHolder = (formData.get("bankAccountHolder") as string | null)?.trim() || null
  const signatoryName = (formData.get("signatoryName") as string | null)?.trim() || null
  const signatoryMobile = (formData.get("signatoryMobile") as string | null)?.trim() || null
  const signatoryEmail = (formData.get("signatoryEmail") as string | null)?.trim() || null
  const signatoryDesignation = (formData.get("signatoryDesignation") as string | null)?.trim() || null

  if (!businessName) {
    redirect("/dashboard/settings?error=Business%20name%20is%20required")
  }

  await sql`
    UPDATE businesses
    SET
      name = ${businessName},
      legal_name = ${legalName || businessName},
      display_name = ${displayName || businessName},
      business_type = ${businessType},
      website_url = ${websiteUrl},
      address = ${address},
      phone = ${phone},
      email = ${email},
      gst_number = ${gstNumber},
      logo_url = COALESCE(${logoUrl}, logo_url),
      bank_account_number = ${bankAccountNumber},
      bank_ifsc = ${bankIfsc},
      bank_name = ${bankName},
      bank_branch = ${bankBranch},
      bank_account_holder = ${bankAccountHolder},
      signatory_name = ${signatoryName},
      signatory_mobile = ${signatoryMobile},
      signatory_email = ${signatoryEmail},
      signatory_designation = ${signatoryDesignation},
      updated_at = NOW()
    WHERE id = ${businessId}
  `

  revalidatePath("/dashboard/settings")
  redirect("/dashboard/settings?success=Business%20settings%20updated")
}

export async function updateInvoiceSettingsAction(formData: FormData) {
  const { businessId } = await getSessionContext()

  const prefix = (formData.get("invoicePrefix") as string | null)?.trim().toUpperCase() || "INV"
  const startingNumber = toNumber(formData.get("startingNumber"), 1)
  const defaultPlaceOfSupply = (formData.get("defaultPlaceOfSupply") as string | null)?.trim() || null
  const defaultReverseCharge = ((formData.get("defaultReverseCharge") as string | null)?.trim() || "No") === "Yes" ? "Yes" : "No"
  const defaultTransporterName = (formData.get("defaultTransporterName") as string | null)?.trim() || null
  const defaultSupplyType = (formData.get("defaultSupplyType") as string | null)?.trim() || null
  const defaultDocumentType = (formData.get("defaultDocumentType") as string | null)?.trim() || null
  const defaultIsService = (formData.get("defaultIsService") as string | null)?.trim() || null
  const defaultTransportMode = (formData.get("defaultTransportMode") as string | null)?.trim() || null
  const defaultTerms = (formData.get("defaultTerms") as string | null)?.trim() || null

  await sql`
    UPDATE businesses
    SET
      invoice_prefix = ${prefix.slice(0, 20)},
      invoice_next_number = ${Math.max(1, Math.floor(startingNumber))},
      default_place_of_supply = ${defaultPlaceOfSupply},
      default_reverse_charge = ${defaultReverseCharge},
      default_transporter_name = ${defaultTransporterName},
      default_supply_type = ${defaultSupplyType},
      default_document_type = ${defaultDocumentType},
      default_is_service = ${defaultIsService},
      default_transport_mode = ${defaultTransportMode},
      default_terms = ${defaultTerms},
      updated_at = NOW()
    WHERE id = ${businessId}
  `

  revalidatePath("/dashboard/settings")
  redirect("/dashboard/settings?success=Invoice%20settings%20updated")
}

export async function updateAccountSettingsAction(formData: FormData) {
  const { userId } = await getSessionContext()

  const name = (formData.get("name") as string | null)?.trim() || ""
  const email = (formData.get("email") as string | null)?.trim() || ""
  const currentPassword = (formData.get("currentPassword") as string | null)?.trim() || ""
  const newPassword = (formData.get("newPassword") as string | null)?.trim() || ""

  if (!name || !email) {
    redirect("/dashboard/settings?error=Name%20and%20email%20are%20required")
  }

  await sql`
    UPDATE users
    SET name = ${name}, email = ${email}, updated_at = NOW()
    WHERE id = ${userId}
  `

  if (newPassword) {
    if (newPassword.length < 8) {
      redirect("/dashboard/settings?error=New%20password%20must%20be%20at%20least%208%20characters")
    }

    const rows = await sql`
      SELECT password_hash
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    const user = rows[0]
    if (!user) {
      redirect("/dashboard/settings?error=User%20not%20found")
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isCurrentPasswordValid) {
      redirect("/dashboard/settings?error=Current%20password%20is%20incorrect")
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${userId}
    `
  }

  revalidatePath("/dashboard/settings")
  redirect("/dashboard/settings?success=Account%20settings%20updated")
}
