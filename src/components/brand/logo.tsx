import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/constants"

/**
 * SB CashFlow brand mark — a monogram of currency symbols:
 * "$" (dollar) for S and "฿" (baht) for B. Rendered as inline SVG so it stays
 * crisp at any size. The rasterized PNG equivalents live in /public/icons.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={`${APP_NAME} logo`}
    >
      <defs>
        <linearGradient id="sb-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#sb-logo-grad)" />
      <text
        x="256"
        y="270"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Segoe UI', system-ui, Arial, sans-serif"
        fontWeight="800"
        fontSize="250"
        letterSpacing="-14"
        fill="#ffffff"
      >
        $฿
      </text>
    </svg>
  )
}

/** Mark + wordmark, for headers and the login screen. */
export function Logo({
  className,
  markClassName,
  showText = true,
}: {
  className?: string
  markClassName?: string
  showText?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={cn("size-8", markClassName)} />
      {showText ? (
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      ) : null}
    </span>
  )
}
