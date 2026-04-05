import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { getClients, saveClientAction, deleteClientAction } from "@/lib/actions/user-modules"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

interface ClientsPageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    edit?: string
    success?: string
    error?: string
  }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams
  const clients = await getClients({ search: params.q, type: params.type })
  const editingClient = params.edit ? clients.find((client) => client.id === params.edit) : null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Client Management</h1>
        <p className="text-muted-foreground">Add, search, update, and monitor customers and suppliers.</p>
      </div>

      {(params.success || params.error) && (
        <div className={`rounded-md border px-4 py-3 text-sm ${params.error ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-700"}`}>
          {params.error || params.success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Search and filter by name, email, phone, or type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 md:grid-cols-3" method="GET">
              <Input name="q" placeholder="Search clients" defaultValue={params.q || ""} />
              <select
                name="type"
                defaultValue={params.type || "ALL"}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
              >
                <option value="ALL">All types</option>
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
              </select>
              <Button type="submit" variant="outline">Apply filter</Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-muted-foreground">{client.email || client.phone || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.client_type === "CUSTOMER" ? "default" : "secondary"}>
                        {client.client_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(client.total_business_value)}</TableCell>
                    <TableCell>{formatCurrency(client.outstanding_balance)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/clients/${client.id}`}>View</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/clients?edit=${client.id}`}>Edit</Link>
                        </Button>
                        <form action={deleteClientAction}>
                          <input type="hidden" name="id" value={client.id} />
                          <Button size="sm" variant="destructive" type="submit">Delete</Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No clients found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingClient ? "Edit Client" : "Add Client"}</CardTitle>
            <CardDescription>Maintain clean records for billing and ledgers.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveClientAction} className="space-y-3">
              {editingClient && <input type="hidden" name="id" value={editingClient.id} />}
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={editingClient?.name || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={editingClient?.phone || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingClient?.email || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={editingClient?.address || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gstNumber">GST Number (optional)</Label>
                <Input id="gstNumber" name="gstNumber" defaultValue={editingClient?.gst_number || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stateCode">State Code</Label>
                <Input id="stateCode" name="stateCode" placeholder="MH" defaultValue={editingClient?.state_code || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientType">Client Type</Label>
                <select
                  id="clientType"
                  name="clientType"
                  defaultValue={editingClient?.client_type || "CUSTOMER"}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="SUPPLIER">Supplier</option>
                </select>
              </div>
              <Button className="w-full" type="submit">{editingClient ? "Update Client" : "Add Client"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
