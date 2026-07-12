"use client"

import * as React from "react"

import { useTracker } from "@/components/tracker/context"
import { TransactionList } from "@/components/tracker/transaction-list"
import { useCurrency } from "@/lib/currency"
import { formatMoney, periodTransactions } from "@/lib/finance"

export function IncomeView() {
  const { transactions, win, openEdit } = useTracker()
  const { currency } = useCurrency()
  const [search, setSearch] = React.useState("")

  const list = React.useMemo(
    () =>
      periodTransactions(transactions, win, search).filter(
        (t) => t.type === "income"
      ),
    [transactions, win, search]
  )
  const total = React.useMemo(
    () => list.reduce((s, t) => s + t.amount, 0),
    [list]
  )

  return (
    <>
      <div className="stat income" style={{ marginBottom: 16 }}>
        <span>Total income · this range</span>
        <strong>{formatMoney(currency, total)}</strong>
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="search-ico">🔍</span>
          <input
            type="search"
            placeholder="Search income"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.trim() ? (
            <button
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <TransactionList
        items={list}
        search={search}
        emptyText="No income yet. Tap + to add one."
        onEdit={openEdit}
      />
    </>
  )
}
