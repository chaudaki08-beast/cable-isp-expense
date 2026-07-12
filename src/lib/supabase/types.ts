/**
 * Database types — hand-authored to match `supabase/migrations`.
 *
 * NOTE: Row shapes are `type` aliases (not `interface`) on purpose — the
 * Supabase client requires each Row to satisfy `Record<string, unknown>`, and
 * interfaces lack the implicit index signature needed for that. Keep these as
 * `type` so typed queries infer correctly.
 *
 * Once your Supabase project is linked you can regenerate them with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = "owner" | "accountant" | "staff"
export type PaymentMode = "cash" | "upi" | "bank_transfer" | "cheque"
export type TxnDirection = "income" | "expense"

type Timestamps = { created_at: string; updated_at: string }

export type Profile = Timestamps & {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
}

export type BusinessSettings = {
  id: string
  business_name: string
  address: string | null
  phone: string | null
  email: string | null
  gstin: string | null
  fy_start_month: number
  currency: string
  updated_at: string
}

export type Category = {
  id: string
  name: string
  direction: TxnDirection
  is_active: boolean
  sort_order: number
  created_at: string
}

export type BankAccount = Timestamps & {
  id: string
  bank_name: string
  account_name: string
  account_number: string | null
  ifsc: string | null
  opening_balance: number
  current_balance: number
  is_active: boolean
}

export type Vendor = {
  id: string
  name: string
  mobile: string | null
  address: string | null
  is_active: boolean
  created_at: string
}

export type Income = Timestamps & {
  id: string
  txn_date: string
  customer_name: string | null
  category_id: string | null
  description: string | null
  amount: number
  payment_mode: PaymentMode
  bank_account_id: string | null
  notes: string | null
  created_by: string | null
  is_locked: boolean
}

export type Expense = Timestamps & {
  id: string
  txn_date: string
  category_id: string | null
  vendor_id: string | null
  description: string | null
  amount: number
  payment_mode: PaymentMode
  bank_account_id: string | null
  receipt_path: string | null
  notes: string | null
  created_by: string | null
  is_locked: boolean
}

export type Deposit = {
  id: string
  txn_date: string
  bank_account_id: string
  amount: number
  deposited_by: string | null
  slip_path: string | null
  notes: string | null
  created_by: string | null
  is_locked: boolean
  created_at: string
}

export type Purchase = {
  id: string
  txn_date: string
  vendor_id: string
  item: string
  quantity: number
  amount: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export type DailyClosing = {
  id: string
  closing_date: string
  opening_cash: number
  cash_income: number
  cash_expense: number
  cash_deposited: number
  closing_cash: number
  bank_deposits: number
  is_closed: boolean
  closed_by: string | null
  closed_at: string | null
  notes: string | null
  created_at: string
}

export type DashboardSummary = {
  today_income: number
  today_expense: number
  today_deposit: number
  cash_in_hand: number
  total_bank_balance: number
  month_income: number
  month_expense: number
}

/** Generic helper to describe a table for the typed Supabase client. */
type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>
      business_settings: TableDef<BusinessSettings>
      categories: TableDef<Category>
      bank_accounts: TableDef<BankAccount>
      vendors: TableDef<Vendor>
      income: TableDef<Income>
      expenses: TableDef<Expense>
      deposits: TableDef<Deposit>
      purchases: TableDef<Purchase>
      daily_closings: TableDef<DailyClosing>
    }
    Views: Record<string, never>
    Functions: {
      dashboard_summary: {
        Args: { p_date?: string }
        Returns: DashboardSummary
      }
      cash_in_hand: {
        Args: { p_date?: string }
        Returns: number
      }
    }
    Enums: {
      user_role: UserRole
      payment_mode: PaymentMode
      txn_direction: TxnDirection
    }
  }
}
