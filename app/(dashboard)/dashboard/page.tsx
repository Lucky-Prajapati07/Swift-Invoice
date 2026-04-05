import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getDashboardStats, getSubscriptionInfo } from "@/lib/actions/dashboard"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentInvoices } from "@/components/dashboard/recent-invoices"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { TrialBanner } from "@/components/dashboard/trial-banner"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const session = await auth()
  const stats = await getDashboardStats()
  const subscription = await getSubscriptionInfo()

  // Calculate days remaining in trial
  let daysRemaining = 0
  if (subscription?.current_period_end) {
    const endDate = new Date(subscription.current_period_end)
    const today = new Date()
    daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session?.user?.name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-muted-foreground">
          {"Here's what's happening with your business today."}
        </p>
      </div>

      {/* Trial Banner */}
      {subscription && (
        <TrialBanner 
          daysRemaining={daysRemaining} 
          status={subscription.status} 
        />
      )}

      {/* Stats Cards */}
      <StatsCards
        totalRevenue={stats?.totalRevenue || 0}
        totalOutstanding={stats?.totalOutstanding || 0}
        totalClients={stats?.totalClients || 0}
        totalInvoices={stats?.totalInvoices || 0}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentInvoices invoices={stats?.recentInvoices || []} />
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
