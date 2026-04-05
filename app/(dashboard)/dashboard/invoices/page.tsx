import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InvoiceForm } from "@/components/dashboard/invoice-form"
import {
  getInvoices,
  getClientsForSelect,
  getSettingsData,
  saveInvoiceAction,
  deleteInvoiceAction,
  markInvoicePaidAction,
  getInvoiceDetail,
} from "@/lib/actions/user-modules"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

interface InvoicesPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    clientId?: string
    edit?: string
    success?: string
    error?: string
  }>
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams

  const [invoices, clients, settings] = await Promise.all([
    getInvoices({ search: params.q, status: params.status, clientId: params.clientId }),
    getClientsForSelect(),
    getSettingsData(),
  ])

  const editData = params.edit ? await getInvoiceDetail(params.edit) : null

  const initialInvoice = editData
    ? {
        ...editData.invoice,
        id: editData.invoice.id,
        client_id: editData.invoice.client_id,
        items: editData.items,
      }
    : null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Invoice Module</h1>
        <p className="text-muted-foreground">Create, edit, share, and track invoices with GST tax support.</p>
      </div>

      {(params.success || params.error) && (
        <div className={`rounded-md border px-4 py-3 text-sm ${params.error ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-700"}`}>
          {params.error || params.success}
        </div>
      )}

      <InvoiceForm
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          gst_number: client.gst_number,
          address: client.address,
          state_code: client.state_code,
          city: client.city,
          pincode: client.pincode,
          phone: client.phone,
          email: client.email,
        }))}
        action={saveInvoiceAction}
        initial={initialInvoice}
        defaults={{
          place_of_supply: settings.business?.default_place_of_supply || "",
          reverse_charge: settings.business?.default_reverse_charge || "No",
          transport_mode: settings.business?.default_transport_mode || "",
          terms: settings.business?.default_terms || "",
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Filter by client, status, or invoice number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-4" method="GET">
            <Input name="q" placeholder="Search invoice/client" defaultValue={params.q || ""} />
            <select
              name="status"
              defaultValue={params.status || "ALL"}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              name="clientId"
              defaultValue={params.clientId || "ALL"}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
            >
              <option value="ALL">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <Button variant="outline" type="submit">Apply filter</Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{invoice.client_name}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "PAID" ? "secondary" : "outline"}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/invoices/${invoice.id}`}>View</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/invoices?edit=${invoice.id}`}>Edit</Link>
                      </Button>
                      {invoice.status !== "PAID" && (
                        <form action={markInvoicePaidAction}>
                          <input type="hidden" name="id" value={invoice.id} />
                          <Button size="sm" type="submit">Mark Paid</Button>
                        </form>
                      )}
                      <form action={deleteInvoiceAction}>
                        <input type="hidden" name="id" value={invoice.id} />
                        <Button size="sm" variant="destructive" type="submit">Delete</Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No invoices found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
