import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Income, Expense } from "@/lib/supabase/types"
import { categoryEmoji } from "@/lib/categories"
import type { Transaction, TxType } from "@/lib/finance"
import { toTransactionRow, type TxFormValues } from "@/lib/validations/transaction"

type DB = SupabaseClient<Database>

export type PickCategory = { id: string; name: string; emoji: string }

function tableFor(type: TxType): "income" | "expenses" {
  return type === "income" ? "income" : "expenses"
}

function mapRow(
  row: Income | Expense,
  source: TxType,
  catName: Map<string, string>
): Transaction {
  const name = row.category_id
    ? (catName.get(row.category_id) ?? "Uncategorized")
    : "Uncategorized"
  return {
    id: row.id,
    source,
    type: source,
    amount: Number(row.amount),
    categoryId: row.category_id,
    categoryName: name,
    emoji: categoryEmoji(name, source),
    note: row.description ?? "",
    date: row.txn_date,
    createdAt: row.created_at ?? null,
  }
}

export type FetchResult = {
  transactions: Transaction[]
  incomeCategories: PickCategory[]
  expenseCategories: PickCategory[]
}

export async function fetchAll(supabase: DB): Promise<FetchResult> {
  const [incRes, expRes, catRes] = await Promise.all([
    supabase.from("income").select("*"),
    supabase.from("expenses").select("*"),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
  ])

  const err = incRes.error || expRes.error || catRes.error
  if (err) throw err

  const cats = catRes.data ?? []
  const catName = new Map(cats.map((c) => [c.id, c.name]))

  const transactions: Transaction[] = [
    ...(incRes.data ?? []).map((r) => mapRow(r, "income", catName)),
    ...(expRes.data ?? []).map((r) => mapRow(r, "expense", catName)),
  ]

  const pick = (dir: TxType): PickCategory[] =>
    cats
      .filter((c) => c.direction === dir)
      .map((c) => ({ id: c.id, name: c.name, emoji: categoryEmoji(c.name, dir) }))

  return {
    transactions,
    incomeCategories: pick("income"),
    expenseCategories: pick("expense"),
  }
}

export async function createTransaction(
  supabase: DB,
  userId: string,
  values: TxFormValues
): Promise<void> {
  const { error } = await supabase
    .from(tableFor(values.type))
    .insert(toTransactionRow(values, userId))
  if (error) throw error
}

export async function updateTransaction(
  supabase: DB,
  source: TxType,
  id: string,
  userId: string,
  values: TxFormValues
): Promise<void> {
  if (source === values.type) {
    const { error } = await supabase
      .from(tableFor(source))
      .update(toTransactionRow(values, userId))
      .eq("id", id)
    if (error) throw error
    return
  }
  // Type changed → move the row to the other table.
  const { error: insErr } = await supabase
    .from(tableFor(values.type))
    .insert(toTransactionRow(values, userId))
  if (insErr) throw insErr
  const { error: delErr } = await supabase
    .from(tableFor(source))
    .delete()
    .eq("id", id)
  if (delErr) throw delErr
}

export async function deleteTransaction(
  supabase: DB,
  source: TxType,
  id: string
): Promise<void> {
  const { error } = await supabase.from(tableFor(source)).delete().eq("id", id)
  if (error) throw error
}
