import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  getTransactions,
  getClientsForSelect,
  getInvoices,
  saveTransactionAction,
  deleteTransactionAction,
} from "@/lib/actions/user-modules"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

interface TransactionsPageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    clientId?: string
    success?: string
    error?: string
  }>
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams

  const [transactions, clients, invoices] = await Promise.all([
    getTransactions({ search: params.q, type: params.type, clientId: params.clientId }),
    getClientsForSelect(),
    getInvoices(),
  ])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Accounts / Transactions</h1>
        <p className="text-muted-foreground">Track income and expenses with optional invoice linking.</p>
      </div>

      {(params.success || params.error) && (
        <div className={`rounded-md border px-4 py-3 text-sm ${params.error ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-700"}`}>
          {params.error || params.success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
            <CardDescription>Update your ledger in one step.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveTransactionAction} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="type">Type</Label>
                <select id="type" name="type" className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" defaultValue="INCOME">
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="transactionDate">Date</Label>
                <Input id="transactionDate" name="transactionDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentMode">Mode</Label>
                <select id="paymentMode" name="paymentMode" className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" defaultValue="CASH">
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientId">Client (optional)</Label>
                <select id="clientId" name="clientId" className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" defaultValue="">
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="invoiceId">Linked invoice (optional)</Label>
                <select id="invoiceId" name="invoiceId" className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]" defaultValue="">
                  <option value="">No invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>{invoice.invoice_number}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Optional details" />
              </div>
              <Button className="w-full" type="submit">Save Transaction</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Ledger</CardTitle>
            <CardDescription>Per-client transaction history with filters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="GET" className="grid gap-3 md:grid-cols-4">
              <Input name="q" placeholder="Search description/client" defaultValue={params.q || ""} />
              <select name="type" defaultValue={params.type || "ALL"} className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]">
                <option value="ALL">All types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
              <select name="clientId" defaultValue={params.clientId || "ALL"} className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]">
                <option value="ALL">All clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <Button type="submit" variant="outline">Apply filter</Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.transaction_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === "INCOME" ? "secondary" : "outline"}>{transaction.type}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell>{transaction.payment_mode}</TableCell>
                    <TableCell>{transaction.client_name || "-"}</TableCell>
                    <TableCell>{transaction.invoice_number || "-"}</TableCell>
                    <TableCell className="text-right">
                      <form action={deleteTransactionAction}>
                        <input type="hidden" name="id" value={transaction.id} />
                        <Button size="sm" variant="destructive" type="submit">Delete</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No transactions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
