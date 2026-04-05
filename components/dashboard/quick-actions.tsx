"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, UserPlus, Receipt, BarChart3 } from "lucide-react"

const actions = [
  {
    title: "Create Invoice",
    description: "Generate a new GST-compliant invoice",
    href: "/dashboard/invoices/new",
    icon: FileText,
    variant: "default" as const,
  },
  {
    title: "Add Client",
    description: "Add a new client to your list",
    href: "/dashboard/clients/new",
    icon: UserPlus,
    variant: "outline" as const,
  },
  {
    title: "Record Transaction",
    description: "Log income or expense",
    href: "/dashboard/transactions/new",
    icon: Receipt,
    variant: "outline" as const,
  },
  {
    title: "View Reports",
    description: "Analyze your business performance",
    href: "/dashboard/reports",
    icon: BarChart3,
    variant: "outline" as const,
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <Button
              key={action.href}
              variant={action.variant}
              asChild
              className="h-auto w-full justify-start overflow-hidden py-4 whitespace-normal"
            >
              <Link href={action.href}>
                <action.icon className="h-5 w-5 mr-3 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                  <span className="w-full truncate font-medium">{action.title}</span>
                  <span className="w-full truncate text-xs font-normal text-muted-foreground">
                    {action.description}
                  </span>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
