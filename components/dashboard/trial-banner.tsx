"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Clock } from "lucide-react"

interface TrialBannerProps {
  daysRemaining: number
  status: string
}

export function TrialBanner({ daysRemaining, status }: TrialBannerProps) {
  if (status === "ACTIVE") return null

  if (status === "TRIALING") {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {daysRemaining > 0
                  ? `${daysRemaining} days left in your free trial`
                  : "Your trial has ended"}
              </p>
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock unlimited invoices and premium features
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/settings/billing">
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade Now
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status === "EXPIRED" || status === "PAST_DUE") {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">
                {status === "EXPIRED" ? "Your subscription has expired" : "Payment overdue"}
              </p>
              <p className="text-sm text-muted-foreground">
                Renew your subscription to continue using Swift-Invoice
              </p>
            </div>
          </div>
          <Button variant="destructive" asChild>
            <Link href="/dashboard/settings/billing">
              Renew Subscription
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
