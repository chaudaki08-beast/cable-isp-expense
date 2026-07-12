"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { LayoutDashboard, TrendingUp, TrendingDown } from "lucide-react"

import { logout } from "@/app/(auth)/login/actions"
import { useTransactions } from "@/hooks/use-transactions"
import { useCurrency, CURRENCIES } from "@/lib/currency"
import {
  periodWindow,
  rangeLabel,
  startOfMonth,
  type Period,
  type Transaction,
  type TxType,
} from "@/lib/finance"
import { TrackerContext } from "./context"
import { TransactionSheet } from "./transaction-sheet"

const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All" },
]

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/income", label: "Income", icon: TrendingUp },
  { href: "/expenses", label: "Expenses", icon: TrendingDown },
]

export function TrackerShell({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const data = useTransactions()
  const { currency, setCurrency } = useCurrency()
  const { resolvedTheme, setTheme } = useTheme()

  const [mounted, setMounted] = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState(() => startOfMonth(new Date()))
  const [period, setPeriod] = React.useState<Period>("month")
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Transaction | null>(null)
  const [addType, setAddType] = React.useState<TxType>("expense")

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [menuOpen])

  const win = React.useMemo(
    () => periodWindow(period, viewMonth),
    [period, viewMonth]
  )

  const openAdd = React.useCallback((type: TxType = "expense") => {
    setEditing(null)
    setAddType(type)
    setSheetOpen(true)
  }, [])
  const openEdit = React.useCallback((t: Transaction) => {
    setEditing(t)
    setSheetOpen(true)
  }, [])

  const ctx = React.useMemo(
    () => ({
      transactions: data.transactions,
      incomeCategories: data.incomeCategories,
      expenseCategories: data.expenseCategories,
      loading: data.loading,
      error: data.error,
      refresh: data.refresh,
      viewMonth,
      setViewMonth,
      period,
      setPeriod,
      win,
      openAdd,
      openEdit,
    }),
    [data, viewMonth, period, win, openAdd, openEdit]
  )

  // Default type for the FAB based on the active tab.
  const fabType: TxType = pathname.startsWith("/income") ? "income" : "expense"
  const isDark = mounted && resolvedTheme === "dark"

  if (!mounted || data.loading) {
    return (
      <div className="app">
        <p className="t-muted" style={{ textAlign: "center", padding: "90px 0" }}>
          Loading…
        </p>
      </div>
    )
  }

  return (
    <TrackerContext.Provider value={ctx}>
      <div className="app">
        {/* Topbar */}
        <header className="topbar">
          <div className="month-nav">
            {period !== "all" ? (
              <button
                className="icon-btn"
                aria-label="Previous month"
                onClick={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
              >
                ‹
              </button>
            ) : null}
            <button
              className="month-label"
              onClick={() => setViewMonth(startOfMonth(new Date()))}
            >
              {rangeLabel(period, viewMonth)}
            </button>
            {period !== "all" ? (
              <button
                className="icon-btn"
                aria-label="Next month"
                onClick={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
              >
                ›
              </button>
            ) : null}
          </div>

          <div className="topbar-actions">
            <button
              className="icon-btn"
              aria-label="Toggle theme"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <div style={{ position: "relative" }}>
              <button
                className="icon-btn avatar"
                aria-label="Account menu"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen((o) => !o)
                }}
              >
                {(email || "?").charAt(0)}
              </button>
              {menuOpen ? (
                <div className="menu" onClick={(e) => e.stopPropagation()}>
                  <div className="menu-email">{email}</div>
                  <label className="menu-row">
                    <span>Currency</span>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="menu-row danger" onClick={() => logout()}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Global period filter */}
        <div className="chip-row">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`chip ${period === p.value ? "active" : ""}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {data.error ? (
          <p className="auth-error" style={{ textAlign: "left" }}>
            {data.error}
          </p>
        ) : null}

        {/* Page content */}
        <main>{children}</main>

        {/* Add */}
        <button
          className="fab"
          aria-label="Add transaction"
          onClick={() => openAdd(fabType)}
        >
          +
        </button>
      </div>

      {/* Bottom tab navigation */}
      <nav className="tabbar">
        <div className="tabbar-inner">
          {TABS.map((t) => {
            const active =
              pathname === t.href || pathname.startsWith(`${t.href}/`)
            const Icon = t.icon
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`tab-item ${active ? "active" : ""}`}
              >
                <Icon />
                {t.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <TransactionSheet
        open={sheetOpen}
        editing={editing}
        defaultType={addType}
        incomeCategories={data.incomeCategories}
        expenseCategories={data.expenseCategories}
        supabase={data.supabase}
        userId={data.userId}
        onClose={() => setSheetOpen(false)}
        onSaved={data.refresh}
      />
    </TrackerContext.Provider>
  )
}
