import { WifiOff } from "lucide-react"

export const metadata = { title: "Offline" }

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <WifiOff className="size-7" />
      </div>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        SB CashFlow can&apos;t reach the network right now. Reconnect and the
        page will load again.
      </p>
    </main>
  )
}
