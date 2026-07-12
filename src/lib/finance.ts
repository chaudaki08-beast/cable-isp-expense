/* ============================================================
   Pure finance logic — ported from the ExpenseTracker reference
   (js/app.js). No React, no Supabase: just data in, data out.
   Operates on a unified Transaction shape merged from the
   `income` and `expenses` tables.
   ============================================================ */

export type TxType = "income" | "expense"
export type Period = "month" | "3m" | "6m" | "year" | "all"
export type TypeFilter = "all" | "income" | "expense"

export type Transaction = {
  id: string
  source: TxType // which table the row came from
  type: TxType
  amount: number
  categoryId: string | null
  categoryName: string
  emoji: string
  note: string
  date: string // YYYY-MM-DD
  createdAt: string | null
}

const pad2 = (n: number) => String(n).padStart(2, "0")

export function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** [startDate, endDate] as YYYY-MM-DD for the period anchored on viewMonth. */
export function periodWindow(
  period: Period,
  viewMonth: Date
): [string, string] {
  const y = viewMonth.getFullYear()
  const m = viewMonth.getMonth()
  const first = (yy: number, mm: number) => `${yy}-${pad2(mm + 1)}-01`
  const last = (yy: number, mm: number) =>
    `${yy}-${pad2(mm + 1)}-${pad2(new Date(yy, mm + 1, 0).getDate())}`

  switch (period) {
    case "3m": {
      const s = new Date(y, m - 2, 1)
      return [first(s.getFullYear(), s.getMonth()), last(y, m)]
    }
    case "6m": {
      const s = new Date(y, m - 5, 1)
      return [first(s.getFullYear(), s.getMonth()), last(y, m)]
    }
    case "year":
      return [`${y}-01-01`, `${y}-12-31`]
    case "all":
      return ["0000-01-01", "9999-12-31"]
    default:
      return [first(y, m), last(y, m)]
  }
}

export function rangeLabel(period: Period, viewMonth: Date): string {
  if (period === "all") return "All time"
  const [s, e] = periodWindow(period, viewMonth)
  const sd = new Date(s + "T00:00:00")
  const ed = new Date(e + "T00:00:00")
  if (period === "month")
    return sd.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  if (period === "year") return String(sd.getFullYear())
  const sm = sd.toLocaleDateString(undefined, { month: "short" })
  const em = ed.toLocaleDateString(undefined, { month: "short" })
  return sd.getFullYear() === ed.getFullYear()
    ? `${sm} – ${em} ${ed.getFullYear()}`
    : `${sm} ${sd.getFullYear()} – ${em} ${ed.getFullYear()}`
}

/** Transactions inside the window, then narrowed by the search text. */
export function periodTransactions(
  transactions: Transaction[],
  window: [string, string],
  search: string
): Transaction[] {
  const [start, end] = window
  let list = transactions.filter((t) => {
    const d = t.date || ""
    return d >= start && d <= end
  })
  const q = search.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (t) =>
        t.categoryName.toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q)
    )
  }
  return list
}

export function totals(list: Transaction[]): { income: number; expense: number } {
  const income = list
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const expense = list
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  return { income, expense }
}

/**
 * Opening balance = net of everything BEFORE the window start (carried
 * forward). Zero when viewing "all" or while searching (a running total
 * only makes sense for a contiguous, unsearched period).
 */
export function openingBalance(
  transactions: Transaction[],
  winStart: string,
  period: Period,
  searching: boolean
): number {
  if (period === "all" || searching) return 0
  let opening = 0
  for (const t of transactions) {
    if ((t.date || "") < winStart) {
      opening += (t.type === "income" ? 1 : -1) * (Number(t.amount) || 0)
    }
  }
  return opening
}

export type BreakdownRow = {
  categoryId: string | null
  name: string
  emoji: string
  amount: number
  pct: number
}

export function breakdown(
  list: Transaction[],
  expenseTotal: number,
  topN = 4
): BreakdownRow[] {
  if (!expenseTotal) return []
  const byCat = new Map<string, BreakdownRow>()
  for (const t of list) {
    if (t.type !== "expense") continue
    const key = t.categoryId ?? t.categoryName
    const existing = byCat.get(key)
    if (existing) {
      existing.amount += Number(t.amount) || 0
    } else {
      byCat.set(key, {
        categoryId: t.categoryId,
        name: t.categoryName,
        emoji: t.emoji,
        amount: Number(t.amount) || 0,
        pct: 0,
      })
    }
  }
  return [...byCat.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN)
    .map((r) => ({ ...r, pct: Math.round((r.amount / expenseTotal) * 100) }))
}

export type DayGroup = { date: string; label: string; items: Transaction[] }

export function groupByDay(list: Transaction[]): DayGroup[] {
  const groups = new Map<string, Transaction[]>()
  for (const t of list) {
    const arr = groups.get(t.date) ?? []
    arr.push(t)
    groups.set(t.date, arr)
  }
  return [...groups.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, label: dayLabel(date), items: groups.get(date)! }))
}

export function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const today = todayStr()
  const yest = todayStr(new Date(Date.now() - 86400000))
  if (dateStr === today) return "Today"
  if (dateStr === yest) return "Yesterday"
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function formatMoney(currency: string, n: number): string {
  const v = Math.abs(Number(n) || 0)
  return (
    currency +
    v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  )
}

export function signedMoney(currency: string, n: number): string {
  return (n < 0 ? "-" : "") + formatMoney(currency, n)
}
