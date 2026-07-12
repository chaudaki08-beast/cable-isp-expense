"use client"

import * as React from "react"

import { useTracker } from "@/components/tracker/context"
import { TransactionList } from "@/components/tracker/transaction-list"
import { useCurrency } from "@/lib/currency"
import {
  breakdown,
  formatMoney,
  openingBalance,
  periodTransactions,
  signedMoney,
  totals,
} from "@/lib/finance"

export function DashboardView() {
  const { transactions, win, period, openEdit } = useTracker()
  const { currency } = useCurrency()

  const list = React.useMemo(
    () => periodTransactions(transactions, win, ""),
    [transactions, win]
  )
  const { income, expense } = React.useMemo(() => totals(list), [list])
  const opening = React.useMemo(
    () => openingBalance(transactions, win[0], period, false),
    [transactions, win, period]
  )
  const closing = opening + income - expense
  const bd = React.useMemo(() => breakdown(list, expense), [list, expense])

  return (
    <>
      <section className="summary">
        <div className="balance-card">
          <span className="b-label">
            {opening !== 0 ? "Balance (carried forward)" : "Balance"}
          </span>
          <strong className="balance">{signedMoney(currency, closing)}</strong>
          {opening !== 0 ? (
            <span className="opening">
              Opening balance {signedMoney(currency, opening)}
            </span>
          ) : null}
        </div>
        <div className="stat income">
          <span>Income</span>
          <strong>{formatMoney(currency, income)}</strong>
        </div>
        <div className="stat expense">
          <span>Expense</span>
          <strong>{formatMoney(currency, expense)}</strong>
        </div>
      </section>

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

      <div className="section-title">Recent activity</div>
      <TransactionList
        items={list}
        emptyText="No transactions in this period yet. Tap + to add one."
        onEdit={openEdit}
      />
    </>
  )
}
