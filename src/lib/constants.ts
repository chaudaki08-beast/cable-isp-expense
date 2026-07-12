import type { PaymentMode, UserRole } from "@/lib/supabase/types"

export const APP_NAME = "SB CashFlow"

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
]

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
}

/** Modes that move money through a bank account (need a bank selected). */
export const BANK_PAYMENT_MODES: PaymentMode[] = ["upi", "bank_transfer", "cheque"]

export const ROLES: { value: UserRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "accountant", label: "Accountant" },
  { value: "staff", label: "Staff" },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  accountant: "Accountant",
  staff: "Staff",
}

export const DEFAULT_INCOME_CATEGORIES = [
  "Broadband Bill",
  "Cable Bill",
  "Installation",
  "Router Sale",
  "Reconnection",
  "Miscellaneous",
]

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Salary",
  "Fuel",
  "Electricity",
  "Rent",
  "Fiber Purchase",
  "Cable Purchase",
  "Router Purchase",
  "Office",
  "Tea & Snacks",
  "Maintenance",
  "Transport",
  "Miscellaneous",
]

/** Format a number as Indian Rupees. */
export function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

/** Compact currency for tight spaces (e.g. ₹1.2L). */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
