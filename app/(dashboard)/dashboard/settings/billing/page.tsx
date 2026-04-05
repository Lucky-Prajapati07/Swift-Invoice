import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getBillingData, createRazorpayPaymentLinkAction } from "@/lib/actions/subscription"

interface BillingPageProps {
  searchParams: Promise<{ payment?: string; error?: string }>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams
  const billing = await getBillingData()

  if (!billing) {
    return <div className="p-6">Unable to load billing information.</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your plan and payment status.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings">Back to Settings</Link>
        </Button>
      </div>

      {(params.payment || params.error) && (
        <div className={`rounded-md border px-4 py-3 text-sm ${params.error ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-700"}`}>
          {params.error || "Payment completed. Subscription will update shortly."}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Live status from your subscription record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Plan:</span>
            <Badge>{billing.plan}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={billing.status === "ACTIVE" ? "secondary" : "outline"}>{billing.status}</Badge>
          </div>
          {billing.trial_ends_at && (
            <p>Trial expires on {new Date(billing.trial_ends_at).toLocaleDateString("en-IN")}</p>
          )}
          {billing.current_period_end && (
            <p>Current period ends on {new Date(billing.current_period_end).toLocaleDateString("en-IN")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Plan</CardTitle>
            <CardDescription>{formatCurrency(billing.pricing.monthly)} / month</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createRazorpayPaymentLinkAction}>
              <input type="hidden" name="plan" value="MONTHLY" />
              <Button type="submit" className="w-full">Upgrade to Monthly</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yearly Plan</CardTitle>
            <CardDescription>{formatCurrency(billing.pricing.yearly)} / year</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createRazorpayPaymentLinkAction}>
              <input type="hidden" name="plan" value="YEARLY" />
              <Button type="submit" className="w-full">Upgrade to Yearly</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
