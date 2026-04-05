import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { markInvoicePaidAction, getInvoiceDetail } from "@/lib/actions/user-modules"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params
  const data = await getInvoiceDetail(id)

  if (!data) {
    notFound()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice {data.invoice.invoice_number}</h1>
          <p className="text-muted-foreground">Client: {data.invoice.client_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/api/invoices/${data.invoice.id}/pdf`} target="_blank">Generate PDF</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/api/invoices/${data.invoice.id}/pdf?download=1`}>Download invoice</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/invoice/${data.invoice.share_token}`} target="_blank">Share via link</Link>
          </Button>
          {data.invoice.status !== "PAID" && (
            <form action={markInvoicePaidAction}>
              <input type="hidden" name="id" value={data.invoice.id} />
              <Button type="submit">Mark as paid</Button>
            </form>
          )}
          <Button asChild variant="ghost">
            <Link href="/dashboard/invoices">Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent><Badge>{data.invoice.status}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Invoice Date</CardTitle></CardHeader>
          <CardContent>{new Date(data.invoice.invoice_date).toLocaleDateString("en-IN")}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Due Date</CardTitle></CardHeader>
          <CardContent>{data.invoice.due_date ? new Date(data.invoice.due_date).toLocaleDateString("en-IN") : "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Tax System</CardTitle></CardHeader>
          <CardContent>{data.invoice.tax_type}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tax %</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.hsn_code || "-"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.rate)}</TableCell>
                  <TableCell>{item.discount_percent}%</TableCell>
                  <TableCell>{item.tax_percent}%</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 ml-auto max-w-sm space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(data.invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(data.invoice.cgst_amount)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(data.invoice.sgst_amount)}</span></div>
            <div className="flex justify-between"><span>IGST</span><span>{formatCurrency(data.invoice.igst_amount)}</span></div>
            <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{formatCurrency(data.invoice.total_amount)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
