import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getClientsForSelect, getReportData } from "@/lib/actions/user-modules"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

interface ReportsPageProps {
  searchParams: Promise<{
    from?: string
    to?: string
    clientId?: string
    status?: string
  }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams
  const [report, clients] = await Promise.all([
    getReportData({ from: params.from, to: params.to, clientId: params.clientId, status: params.status }),
    getClientsForSelect(),
  ])

  const clientFilterValue = report.filters.clientId || "ALL"

  const exportQuery = new URLSearchParams({
    from: report.filters.from,
    to: report.filters.to,
    clientId: clientFilterValue,
    status: report.filters.status,
  }).toString()

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Sales, purchases, P&L, client-wise and GST summary with export options.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Use date range, client, and status to scope the report.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid gap-3 md:grid-cols-5">
            <input type="date" name="from" defaultValue={report.filters.from} className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
            <input type="date" name="to" defaultValue={report.filters.to} className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" />
            <select name="clientId" defaultValue={clientFilterValue} className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]">
              <option value="ALL">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <select name="status" defaultValue={report.filters.status} className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]">
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <Button type="submit" variant="outline">Generate</Button>
          </form>
          <div className="mt-3 flex gap-2">
            <Button asChild>
              <Link href={`/api/reports/export?${exportQuery}&format=csv`}>Export CSV</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/api/reports/export?${exportQuery}&format=pdf`}>Export PDF</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm">Sales Report</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrency(report.salesTotal)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Purchase Report</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrency(report.purchaseTotal)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Profit & Loss</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrency(report.profitLoss)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">GST Collected</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrency(report.gst.totalTaxCollected)}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">GST Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>CGST: {formatCurrency(report.gst.totalCgst)}</p>
            <p>SGST: {formatCurrency(report.gst.totalSgst)}</p>
            <p>IGST: {formatCurrency(report.gst.totalIgst)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client-wise Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Invoice Count</TableHead>
                <TableHead>Total Business</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.clientWise.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.invoiceCount}</TableCell>
                  <TableCell>{formatCurrency(row.total)}</TableCell>
                </TableRow>
              ))}
              {report.clientWise.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data in selected filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
