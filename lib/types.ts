export type UserRole = "USER" | "ADMIN"
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED"
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED"
export type TransactionType = "INCOME" | "EXPENSE"
export type NotificationType = "INVOICE_DUE" | "PAYMENT_RECEIVED" | "SUBSCRIPTION_EXPIRING" | "SYSTEM"

export interface User {
  id: string
  email: string
  name: string
  password_hash: string
  role: UserRole
  email_verified: boolean
  requires_email_verification: boolean
  created_at: Date
  updated_at: Date
}

export interface Business {
  id: string
  user_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  gstin: string | null
  pan: string | null
  logo_url: string | null
  invoice_prefix: string
  next_invoice_number: number
  default_place_of_supply: string | null
  default_reverse_charge: string | null
  default_transporter_name: string | null
  default_supply_type: string | null
  default_document_type: string | null
  default_is_service: string | null
  default_transport_mode: string | null
  default_terms: string | null
  created_at: Date
  updated_at: Date
}

export interface Client {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gstin: string | null
  created_at: Date
  updated_at: Date
}

export interface Invoice {
  id: string
  business_id: string
  client_id: string
  invoice_number: string
  issue_date?: Date
  invoice_date: Date
  due_date: Date
  status: InvoiceStatus
  subtotal: number
  tax_type: string | null
  cgst_rate: number | null
  cgst_amount: number
  sgst_rate: number | null
  sgst_amount: number
  igst_rate: number | null
  igst_amount: number
  total_tax: number | null
  total_amount: number
  place_of_supply: string | null
  reverse_charge: string | null
  shipping_name: string | null
  shipping_address: string | null
  shipping_phone: string | null
  shipping_email: string | null
  supply_type: string | null
  document_type: string | null
  is_service: string | null
  transport_mode: string | null
  transporter_name: string | null
  vehicle_no: string | null
  eway_bill_no: string | null
  eway_bill_date: Date | null
  dispatch_name: string | null
  dispatch_address: string | null
  dispatch_pincode: string | null
  preceding_inv_ref: string | null
  preceding_inv_date: Date | null
  notes: string | null
  terms: string | null
  share_token: string | null
  pdf_url: string | null
  created_at: Date
  updated_at: Date
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  hsn_code: string | null
  quantity: number
  unit_price: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number
  amount: number
  created_at: Date
}

export interface Transaction {
  id: string
  business_id: string
  invoice_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  date: Date
  created_at: Date
}

export interface Subscription {
  id: string
  user_id: string
  plan_name: string
  status: SubscriptionStatus
  razorpay_subscription_id: string | null
  current_period_start: Date
  current_period_end: Date
  created_at: Date
  updated_at: Date
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: Date
}

// Extended types with relations
export interface InvoiceWithClient extends Invoice {
  client: Client
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}

export interface InvoiceComplete extends Invoice {
  client: Client
  items: InvoiceItem[]
  business: Business
}

// Form types
export interface ClientFormData {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstin?: string
}

export interface InvoiceItemFormData {
  description: string
  hsn_code?: string
  quantity: number
  unit_price: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number
}

export interface InvoiceFormData {
  client_id: string
  issue_date: string
  due_date: string
  items: InvoiceItemFormData[]
  notes?: string
  terms?: string
}

export interface BusinessFormData {
  name: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  gstin?: string
  pan?: string
  invoice_prefix?: string
}

// Dashboard stats
export interface DashboardStats {
  totalRevenue: number
  totalOutstanding: number
  totalClients: number
  totalInvoices: number
  recentInvoices: InvoiceWithClient[]
  monthlyRevenue: { month: string; revenue: number }[]
}

// Session user type
export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  businessId: string
}
