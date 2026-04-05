"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Plus } from "lucide-react"
import type { InvoiceWithClient, InvoiceStatus } from "@/lib/types"
import { Empty } from "@/components/ui/empty"

interface RecentInvoicesProps {
  invoices: InvoiceWithClient[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function getStatusVariant(status: InvoiceStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "default"
    case "SENT":
      return "secondary"
    case "OVERDUE":
      return "destructive"
    case "DRAFT":
      return "outline"
    case "CANCELLED":
      return "outline"
    default:
      return "outline"
  }
}

function getStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case "PAID":
      return "Paid"
    case "SENT":
      return "Sent"
    case "OVERDUE":
      return "Overdue"
    case "DRAFT":
      return "Draft"
    case "CANCELLED":
      return "Cancelled"
    default:
      return status
  }
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Your latest invoicing activity</CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/invoices/new">
            <Plus className="h-4 w-4 mr-1" />
            New Invoice
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <Empty
            title="No invoices yet"
            description="Create your first invoice to start tracking your business."
          >
            <Button asChild>
              <Link href="/dashboard/invoices/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Link>
            </Button>
          </Empty>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invoice.invoice_number}</span>
                    <Badge variant={getStatusVariant(invoice.status)}>
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.client.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due: {formatDate(invoice.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    {formatCurrency(invoice.total_amount)}
                  </span>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard/invoices">
                  View All Invoices
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
