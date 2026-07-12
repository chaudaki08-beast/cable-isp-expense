"use client"

import * as React from "react"

import { createClient } from "@/lib/supabase/client"
import { fetchAll, type FetchResult } from "@/lib/transactions"

const EMPTY: FetchResult = {
  transactions: [],
  incomeCategories: [],
  expenseCategories: [],
}

/**
 * Single source of truth for the tracker: fetches income + expenses +
 * categories, merges them into a unified list, and re-fetches on demand
 * (after a mutation) or via Supabase realtime when enabled.
 */
export function useTransactions() {
  const supabase = React.useMemo(() => createClient(), [])
  const [data, setData] = React.useState<FetchResult>(EMPTY)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetchAll(supabase)
      setData(res)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  React.useEffect(() => {
    let active = true

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setUserId(data.user?.id ?? null)
      })
      .catch(() => {})

    refresh()

    // Realtime is best-effort: it only fires if the tables are added to the
    // `supabase_realtime` publication. Refresh-after-mutation covers the rest.
    const channel = supabase
      .channel("tx-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "income" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => refresh()
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabase, refresh])

  return {
    supabase,
    userId,
    transactions: data.transactions,
    incomeCategories: data.incomeCategories,
    expenseCategories: data.expenseCategories,
    loading,
    error,
    refresh,
  }
}
