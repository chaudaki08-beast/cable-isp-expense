"use client"

import * as React from "react"

import { formatMoney, groupByDay, type Transaction } from "@/lib/finance"
import { useCurrency } from "@/lib/currency"

/** Split text into nodes with search matches wrapped in <mark>. */
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim()
  if (!q) return text
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig")
  return text.split(re).map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

export function TransactionList({
  items,
  search = "",
  emptyText = "No transactions here yet. Tap + to add one.",
  onEdit,
}: {
  items: Transaction[]
  search?: string
  emptyText?: string
  onEdit: (t: Transaction) => void
}) {
  const { currency } = useCurrency()

  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="big">{search.trim() ? "🔍" : "🧾"}</div>
        <p>
          {search.trim()
            ? `No transactions match “${search.trim()}”.`
            : emptyText}
        </p>
      </div>
    )
  }

  const groups = groupByDay(items)

  return (
    <section className="tx-list">
      {groups.map((g) => (
        <div key={g.date}>
          <div className="tx-day-label">{g.label}</div>
          <div className="tx-group">
            {g.items.map((t) => (
              <button
                key={`${t.source}-${t.id}`}
                className="tx"
                onClick={() => onEdit(t)}
              >
                <div className="tx-icon">{t.emoji}</div>
                <div className="tx-main">
                  <div className="tx-cat">{highlight(t.categoryName, search)}</div>
                  {t.note ? (
                    <div className="tx-note">{highlight(t.note, search)}</div>
                  ) : null}
                </div>
                <div className={`tx-amount ${t.type}`}>
                  {t.type === "income" ? "+" : "-"}
                  {formatMoney(currency, t.amount)}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
