import { redirect } from "next/navigation"

import { getCurrentProfile, isSupabaseConfigured } from "@/lib/auth"
import { CurrencyProvider } from "@/lib/currency"
import { TrackerShell } from "@/components/tracker/shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let email = ""
  if (isSupabaseConfigured()) {
    const profile = await getCurrentProfile()
    if (!profile) redirect("/login")
    email = profile.email
  }

  return (
    <CurrencyProvider>
      <TrackerShell email={email}>{children}</TrackerShell>
    </CurrencyProvider>
  )
}
