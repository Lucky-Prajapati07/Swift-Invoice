"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IndianRupee, Users, FileText, AlertCircle } from "lucide-react"

interface StatsCardsProps {
  totalRevenue: number
  totalOutstanding: number
  totalClients: number
  totalInvoices: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function StatsCards({
  totalRevenue,
  totalOutstanding,
  totalClients,
  totalInvoices,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      description: "Lifetime earnings",
      icon: IndianRupee,
      className: "text-primary",
    },
    {
      title: "Outstanding",
      value: formatCurrency(totalOutstanding),
      description: "Pending payments",
      icon: AlertCircle,
      className: "text-warning-foreground",
    },
    {
      title: "Total Clients",
      value: totalClients.toString(),
      description: "Active clients",
      icon: Users,
      className: "text-chart-2",
    },
    {
      title: "Invoices",
      value: totalInvoices.toString(),
      description: "All time",
      icon: FileText,
      className: "text-chart-3",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.className}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
