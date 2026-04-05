import { redirect } from "next/navigation"

export default function HomePage() {
  // Simple redirect to login - auth check will happen there
  redirect("/login")
}
