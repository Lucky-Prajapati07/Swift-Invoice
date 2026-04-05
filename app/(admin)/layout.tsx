import { redirect } from "next/navigation"
import { auth, requireAdmin } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  await requireAdmin()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-300">Swift-Invoice</p>
            <h1 className="text-lg font-semibold">Admin Module</h1>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}