import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { BusinessSettingsForm } from "@/components/dashboard/business-settings-form"
import {
  getSettingsData,
  updateBusinessSettingsAction,
  updateInvoiceSettingsAction,
  updateAccountSettingsAction,
} from "@/lib/actions/user-modules"

interface SettingsPageProps {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams
  const settings = await getSettingsData()

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage business, invoice, and account configuration.</p>
      </div>

      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings/billing">Billing & Subscription</Link>
        </Button>
      </div>

      {(params.success || params.error) && (
        <div className={`rounded-md border px-4 py-3 text-sm ${params.error ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-700"}`}>
          {params.error || params.success}
        </div>
      )}

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business">Business Settings</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
          <TabsTrigger value="account">Account Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Business profile, bank details, signatory info, and logo upload.</CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessSettingsForm
                action={updateBusinessSettingsAction}
                business={settings.business}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>Control invoice numbering and default template values.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateInvoiceSettingsAction} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="invoicePrefix">Invoice prefix</Label>
                  <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings.business?.invoice_prefix || "INV"} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="startingNumber">Starting number</Label>
                  <Input id="startingNumber" name="startingNumber" type="number" min={1} defaultValue={settings.business?.invoice_next_number || 1} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="defaultPlaceOfSupply">Default place of supply</Label>
                  <Input id="defaultPlaceOfSupply" name="defaultPlaceOfSupply" defaultValue={settings.business?.default_place_of_supply || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="defaultReverseCharge">Default reverse charge</Label>
                  <select
                    id="defaultReverseCharge"
                    name="defaultReverseCharge"
                    defaultValue={settings.business?.default_reverse_charge || "No"}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="defaultTransporterName">Default transporter / ship by</Label>
                  <Input id="defaultTransporterName" name="defaultTransporterName" defaultValue={settings.business?.default_transporter_name || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="defaultSupplyType">Default supply type</Label>
                  <Input id="defaultSupplyType" name="defaultSupplyType" defaultValue={settings.business?.default_supply_type || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="defaultDocumentType">Default document type</Label>
                  <Input id="defaultDocumentType" name="defaultDocumentType" defaultValue={settings.business?.default_document_type || "INV"} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="defaultIsService">Default is service</Label>
                  <Input id="defaultIsService" name="defaultIsService" defaultValue={settings.business?.default_is_service || "No"} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="defaultTransportMode">Default transport mode</Label>
                  <Input id="defaultTransportMode" name="defaultTransportMode" defaultValue={settings.business?.default_transport_mode || ""} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="defaultTerms">Default terms and conditions</Label>
                  <textarea
                    id="defaultTerms"
                    name="defaultTerms"
                    defaultValue={settings.business?.default_terms || ""}
                    rows={4}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                  />
                </div>
                <Button type="submit" className="w-fit">Save Invoice Settings</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Update profile and optionally change password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateAccountSettingsAction} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required defaultValue={settings.account?.name || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required defaultValue={settings.account?.email || ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input id="currentPassword" name="currentPassword" type="password" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input id="newPassword" name="newPassword" type="password" placeholder="Optional, min 8 chars" />
                </div>
                <Button type="submit" className="w-fit">Save Account Settings</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
