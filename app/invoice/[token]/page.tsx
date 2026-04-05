import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPublicInvoiceDetail } from "@/lib/actions/user-modules"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

interface PublicInvoicePageProps {
  params: Promise<{ token: string }>
}

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
  const { token } = await params
  const data = await getPublicInvoiceDetail(token)

  if (!data) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{data.invoice.business_name}</CardTitle>
          <p className="text-sm text-muted-foreground">{data.invoice.business_address || ""}</p>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p><strong>Invoice:</strong> {data.invoice.invoice_number}</p>
          <p><strong>Status:</strong> {data.invoice.status}</p>
          <p><strong>Invoice date:</strong> {new Date(data.invoice.invoice_date).toLocaleDateString("en-IN")}</p>
          <p><strong>Due date:</strong> {data.invoice.due_date ? new Date(data.invoice.due_date).toLocaleDateString("en-IN") : "-"}</p>
          <p><strong>Client:</strong> {data.invoice.client_name}</p>
          <p><strong>Client email:</strong> {data.invoice.client_email || "-"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item: any, index: number) => (
                <TableRow key={`${item.description}-${index}`}>
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
          <div className="mt-4 ml-auto max-w-xs space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(data.invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span>Total tax</span><span>{formatCurrency(data.invoice.total_tax)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(data.invoice.total_amount)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
