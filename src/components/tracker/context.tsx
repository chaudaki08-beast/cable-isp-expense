"use client"

import * as React from "react"

import type { Period, Transaction, TxType } from "@/lib/finance"
import type { PickCategory } from "@/lib/transactions"

export type TrackerValue = {
  // data
  transactions: Transaction[]
  incomeCategories: PickCategory[]
  expenseCategories: PickCategory[]
  loading: boolean
  error: string | null
  refresh: () => void
  // global time filter
  viewMonth: Date
  setViewMonth: React.Dispatch<React.SetStateAction<Date>>
  period: Period
  setPeriod: (p: Period) => void
  win: [string, string]
  // add / edit sheet
  openAdd: (type?: TxType) => void
  openEdit: (t: Transaction) => void
}

const TrackerContext = React.createContext<TrackerValue | null>(null)

export function useTracker(): TrackerValue {
  const v = React.useContext(TrackerContext)
  if (!v) throw new Error("useTracker must be used within <TrackerShell>")
  return v
}

export { TrackerContext }
