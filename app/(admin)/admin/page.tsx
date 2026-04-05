import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getAdminDashboardData,
  getAdminUsers,
  getAdminBusinesses,
  getAdminSubscriptions,
  getAdminSettings,
  blockUserAction,
  deleteUserAction,
  sendBroadcastAction,
  sendTrialReminderAction,
  sendPaymentReminderAction,
  updateAdminSettingsAction,
} from "@/lib/actions/admin"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

interface AdminPageProps {
  searchParams: Promise<{
    tab?: string
    userSearch?: string
    businessFilter?: "ALL" | "GST" | "NON_GST"
    subscriptionStatus?: "ALL" | "TRIAL" | "ACTIVE" | "EXPIRED"
  }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  const session = await requireAdmin()

  const tab = params.tab || "dashboard"
  const userSearch = params.userSearch || ""
  const businessFilter = params.businessFilter || "ALL"
  const subscriptionStatus = params.subscriptionStatus || "ALL"

  const [dashboard, users, businesses, subscriptions, settings] = await Promise.all([
    getAdminDashboardData(),
    getAdminUsers(userSearch),
    getAdminBusinesses(businessFilter),
    getAdminSubscriptions(subscriptionStatus),
    getAdminSettings(),
  ])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#fff8e1,_#fef3c7_45%,_#f5f3ff)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-amber-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Control Center</h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as {session.user.name} ({session.user.email})
          </p>
        </div>

        <Tabs defaultValue={tab} className="space-y-4">
          <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-xl bg-slate-900/90 p-2 md:grid-cols-7">
            <TabsTrigger className="text-xs text-white data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900" value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger className="text-xs text-white data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900" value="users">Users</TabsTrigger>
            <TabsTrigger className="text-xs text-white data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900" value="businesses">Businesses</TabsTrigger>
            <TabsTrigger className="text-xs text-white data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900" value="notifications">Notifications</TabsTrigger>
            <TabsTrigger className="text-xs text-white data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900" value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger className="text-xs text-white data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900" value="reports">Reports</TabsTrigger>
            <TabsTrigger className="text-xs text-white data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900" value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-slate-200 bg-white/90"><CardHeader><CardDescription>Total Users</CardDescription><CardTitle className="text-2xl">{dashboard.totalUsers}</CardTitle></CardHeader></Card>
              <Card className="border-slate-200 bg-white/90"><CardHeader><CardDescription>Active Subscriptions</CardDescription><CardTitle className="text-2xl">{dashboard.activeSubscriptions}</CardTitle></CardHeader></Card>
              <Card className="border-slate-200 bg-white/90"><CardHeader><CardDescription>Revenue (Monthly)</CardDescription><CardTitle className="text-2xl">{formatCurrency(dashboard.revenueMonthly)}</CardTitle></CardHeader></Card>
              <Card className="border-slate-200 bg-white/90"><CardHeader><CardDescription>Revenue (Yearly)</CardDescription><CardTitle className="text-2xl">{formatCurrency(dashboard.revenueYearly)}</CardTitle></CardHeader></Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-200 bg-white/90">
                <CardHeader>
                  <CardTitle>Trial vs Paid Users</CardTitle>
                  <CardDescription>Live subscription split</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2"><span>Trial Users</span><span className="font-semibold">{dashboard.trialUsers}</span></div>
                  <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2"><span>Paid Users</span><span className="font-semibold">{dashboard.paidUsers}</span></div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/90">
                <CardHeader>
                  <CardTitle>Revenue Trend (Last 12 Months)</CardTitle>
                  <CardDescription>Monthly collection summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {dashboard.monthlyRevenue.map((row) => (
                    <div key={row.month} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span>{row.month}</span>
                      <span className="font-medium">{formatCurrency(row.revenue)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="border-slate-200 bg-white/90">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Search, block, and delete users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form method="GET" className="flex flex-wrap gap-2">
                  <input type="hidden" name="tab" value="users" />
                  <Input name="userSearch" defaultValue={userSearch} placeholder="Search by name, email, business" className="max-w-sm" />
                  <Button type="submit" variant="outline">Search</Button>
                </form>

                <div className="overflow-auto rounded-lg border">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Business</th>
                        <th className="p-2">Plan</th>
                        <th className="p-2">Trial Expiry</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-t">
                          <td className="p-2 font-medium">{user.name}</td>
                          <td className="p-2">{user.email}</td>
                          <td className="p-2">{user.business_name || "-"}</td>
                          <td className="p-2">{user.plan || "-"}</td>
                          <td className="p-2">{user.trial_ends_at ? new Date(user.trial_ends_at).toLocaleDateString("en-IN") : "-"}</td>
                          <td className="p-2">
                            {user.is_blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge className="bg-emerald-600">Active</Badge>}
                          </td>
                          <td className="p-2">
                            <div className="flex justify-end gap-2">
                              <form action={blockUserAction}>
                                <input type="hidden" name="userId" value={user.id} />
                                <input type="hidden" name="shouldBlock" value={user.is_blocked ? "false" : "true"} />
                                <Button type="submit" size="sm" variant="outline">{user.is_blocked ? "Unblock" : "Block"}</Button>
                              </form>
                              <form action={deleteUserAction}>
                                <input type="hidden" name="userId" value={user.id} />
                                <Button type="submit" size="sm" variant="destructive">Delete</Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="businesses" className="space-y-4">
            <Card className="border-slate-200 bg-white/90">
              <CardHeader>
                <CardTitle>Business Profiles</CardTitle>
                <CardDescription>Filter GST and non-GST businesses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form method="GET" className="flex items-center gap-2">
                  <input type="hidden" name="tab" value="businesses" />
                  <select name="businessFilter" defaultValue={businessFilter} className="h-9 rounded-md border px-3 text-sm">
                    <option value="ALL">All</option>
                    <option value="GST">GST</option>
                    <option value="NON_GST">Non-GST</option>
                  </select>
                  <Button type="submit" variant="outline">Apply</Button>
                </form>

                <div className="overflow-auto rounded-lg border">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="p-2">Business</th>
                        <th className="p-2">Owner</th>
                        <th className="p-2">GST</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businesses.map((business) => (
                        <tr key={business.id} className="border-t">
                          <td className="p-2 font-medium">{business.name}</td>
                          <td className="p-2">{business.owner_name} ({business.owner_email})</td>
                          <td className="p-2">{business.gst_number || "-"}</td>
                          <td className="p-2">{[business.city, business.state].filter(Boolean).join(", ") || "-"}</td>
                          <td className="p-2">{new Date(business.created_at).toLocaleDateString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-200 bg-white/90">
                <CardHeader>
                  <CardTitle>Broadcast Message</CardTitle>
                  <CardDescription>Send to all users</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={sendBroadcastAction} className="space-y-3">
                    <Input name="title" placeholder="Announcement title" required />
                    <textarea name="message" placeholder="Message" required className="min-h-[120px] w-full rounded-md border p-2 text-sm" />
                    <Button type="submit">Send Broadcast</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/90">
                <CardHeader>
                  <CardTitle>Automated Reminders</CardTitle>
                  <CardDescription>Send batch notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <form action={sendTrialReminderAction}>
                    <Button type="submit" className="w-full" variant="outline">Send Trial Expiry Reminders</Button>
                  </form>
                  <form action={sendPaymentReminderAction}>
                    <Button type="submit" className="w-full" variant="outline">Send Payment Reminders</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card className="border-slate-200 bg-white/90">
              <CardHeader>
                <CardTitle>Subscriptions</CardTitle>
                <CardDescription>Track trial, active, and expired plans</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form method="GET" className="flex items-center gap-2">
                  <input type="hidden" name="tab" value="subscriptions" />
                  <select name="subscriptionStatus" defaultValue={subscriptionStatus} className="h-9 rounded-md border px-3 text-sm">
                    <option value="ALL">All</option>
                    <option value="TRIAL">Trial</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                  <Button type="submit" variant="outline">Apply</Button>
                </form>

                <div className="overflow-auto rounded-lg border">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="p-2">User</th>
                        <th className="p-2">Business</th>
                        <th className="p-2">Plan</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Trial Ends</th>
                        <th className="p-2">Current Period End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((subscription) => (
                        <tr key={subscription.id} className="border-t">
                          <td className="p-2">{subscription.user_name} ({subscription.user_email})</td>
                          <td className="p-2">{subscription.business_name || "-"}</td>
                          <td className="p-2">{subscription.plan}</td>
                          <td className="p-2">{subscription.status}</td>
                          <td className="p-2">{subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString("en-IN") : "-"}</td>
                          <td className="p-2">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-IN") : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-200 bg-white/90">
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Monthly growth and yearly totals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="rounded-md bg-emerald-50 px-3 py-2">Monthly Revenue: <span className="font-semibold">{formatCurrency(dashboard.revenueMonthly)}</span></div>
                  <div className="rounded-md bg-indigo-50 px-3 py-2">Yearly Revenue: <span className="font-semibold">{formatCurrency(dashboard.revenueYearly)}</span></div>
                  {dashboard.monthlyRevenue.map((row) => (
                    <div key={row.month} className="flex justify-between rounded-md border px-3 py-2"><span>{row.month}</span><span>{formatCurrency(row.revenue)}</span></div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/90">
                <CardHeader>
                  <CardTitle>User Acquisition</CardTitle>
                  <CardDescription>New users in last 12 months</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {dashboard.userAcquisition.map((row) => (
                    <div key={row.month} className="flex justify-between rounded-md border px-3 py-2"><span>{row.month}</span><span className="font-medium">{row.users}</span></div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="border-slate-200 bg-white/90 max-w-3xl">
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>Update pricing plans and feature flags</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateAdminSettingsAction} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Monthly Plan Price</label>
                      <Input name="monthlyPrice" type="number" step="0.01" min="0" defaultValue={settings.monthly_price} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Yearly Plan Price</label>
                      <Input name="yearlyPrice" type="number" step="0.01" min="0" defaultValue={settings.yearly_price} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Feature Toggles</p>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="feature_invoicing" defaultChecked={settings.feature_flags.invoicing} /> Invoicing</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="feature_transactions" defaultChecked={settings.feature_flags.transactions} /> Transactions</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="feature_reports" defaultChecked={settings.feature_flags.reports} /> Reports</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="feature_reminders" defaultChecked={settings.feature_flags.reminders} /> Reminders</label>
                  </div>

                  <Button type="submit">Save Settings</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}