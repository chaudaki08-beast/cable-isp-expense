"use client"

import * as React from "react"

import { useTracker } from "@/components/tracker/context"
import { TransactionList } from "@/components/tracker/transaction-list"
import { useCurrency } from "@/lib/currency"
import { breakdown, formatMoney, periodTransactions } from "@/lib/finance"

export function ExpensesView() {
  const { transactions, win, openEdit } = useTracker()
  const { currency } = useCurrency()
  const [search, setSearch] = React.useState("")

  const list = React.useMemo(
    () =>
      periodTransactions(transactions, win, search).filter(
        (t) => t.type === "expense"
      ),
    [transactions, win, search]
  )
  const total = React.useMemo(() => list.reduce((s, t) => s + t.amount, 0), [list])
  const bd = React.useMemo(() => breakdown(list, total), [list, total])

  return (
    <>
      <div className="stat expense" style={{ marginBottom: 16 }}>
        <span>Total expenses · this range</span>
        <strong>{formatMoney(currency, total)}</strong>
      </div>

      {bd.length ? (
        <section className="breakdown">
          {bd.map((row) => (
            <div className="bd-row" key={row.categoryId ?? row.name}>
              <div className="bd-top">
                <span className="cat">
                  {row.emoji} {row.name}
                </span>
                <span>
                  {formatMoney(currency, row.amount)} · {row.pct}%
                </span>
              </div>
              <div className="bd-bar">
                <div className="bd-fill" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <div className="toolbar">
        <div className="search">
          <span className="search-ico">🔍</span>
          <input
            type="search"
            placeholder="Search expenses"
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
        emptyText="No expenses yet. Tap + to add one."
        onEdit={openEdit}
      />
    </>
  )
}
