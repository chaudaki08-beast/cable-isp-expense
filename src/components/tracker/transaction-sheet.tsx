"use client"

import * as React from "react"
import { toast } from "sonner"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/types"
import type { Transaction, TxType } from "@/lib/finance"
import { todayStr } from "@/lib/finance"
import type { PickCategory } from "@/lib/transactions"
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/transactions"
import { txFormSchema } from "@/lib/validations/transaction"
import { useCurrency } from "@/lib/currency"

export function TransactionSheet({
  open,
  editing,
  defaultType,
  incomeCategories,
  expenseCategories,
  supabase,
  userId,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: Transaction | null
  defaultType: TxType
  incomeCategories: PickCategory[]
  expenseCategories: PickCategory[]
  supabase: SupabaseClient<Database>
  userId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { currency } = useCurrency()
  const [type, setType] = React.useState<TxType>(defaultType)
  const [amount, setAmount] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [note, setNote] = React.useState("")
  const [date, setDate] = React.useState(todayStr())
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setAmount(String(editing.amount))
      setCategoryId(editing.categoryId ?? "")
      setNote(editing.note ?? "")
      setDate(editing.date || todayStr())
    } else {
      setType(defaultType)
      setAmount("")
      setCategoryId("")
      setNote("")
      setDate(todayStr())
    }
  }, [open, editing, defaultType])

  if (!open) return null

  const cats = type === "income" ? incomeCategories : expenseCategories

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      toast.error("You must be signed in.")
      return
    }
    const parsed = txFormSchema.safeParse({
      type,
      amount,
      category_id: categoryId,
      note,
      date,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form")
      return
    }
    setBusy(true)
    try {
      if (editing) {
        await updateTransaction(supabase, editing.source, editing.id, userId, parsed.data)
        toast.success("Updated")
      } else {
        await createTransaction(supabase, userId, parsed.data)
        toast.success("Saved")
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!window.confirm("Delete this transaction?")) return
    setBusy(true)
    try {
      await deleteTransaction(supabase, editing.source, editing.id)
      toast.success("Deleted")
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="sheet" onSubmit={handleSave}>
        <div className="sheet-handle" />
        <h2>{editing ? "Edit transaction" : "Add transaction"}</h2>

        <div className="type-toggle">
          <button
            type="button"
            className={`type-btn expense ${type === "expense" ? "active" : ""}`}
            onClick={() => {
              setType("expense")
              setCategoryId("")
            }}
          >
            Expense
          </button>
          <button
            type="button"
            className={`type-btn income ${type === "income" ? "active" : ""}`}
            onClick={() => {
              setType("income")
              setCategoryId("")
            }}
          >
            Income
          </button>
        </div>

        <div className="amount-input">
          <span className="cur">{currency}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus={!editing}
          />
        </div>

        <label className="field">
          <span>Category</span>
          <div className="cat-grid">
            {cats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`cat ${categoryId === c.id ? "active" : ""}`}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="emoji">{c.emoji}</span>
                {c.name}
              </button>
            ))}
          </div>
        </label>

        <label className="field" style={{ marginTop: 14 }}>
          <span>Note (optional)</span>
          <input
            className="t-input"
            type="text"
            maxLength={200}
            placeholder="e.g. July broadband"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <label className="field" style={{ marginTop: 14 }}>
          <span>Date</span>
          <input
            className="t-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>

        {editing ? (
          <button
            type="button"
            className="btn btn-delete"
            onClick={handleDelete}
            disabled={busy}
          >
            Delete transaction
          </button>
        ) : null}
      </form>
    </div>
  )
}
