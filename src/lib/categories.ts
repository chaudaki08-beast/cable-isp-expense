import type { TxType } from "@/lib/finance"

/**
 * Emoji for each seeded category (matched by name). Keeps the existing
 * `categories` table untouched while giving the picker emoji chips.
 * Falls back to a per-type default for anything not listed.
 */
const CATEGORY_EMOJI: Record<string, string> = {
  // Income
  "Broadband Bill": "📡",
  "Cable Bill": "📺",
  Installation: "🔧",
  "Router Sale": "📶",
  Reconnection: "🔌",
  // Expense
  Salary: "💼",
  Fuel: "⛽",
  Electricity: "💡",
  Rent: "🏠",
  "Fiber Purchase": "🧵",
  "Cable Purchase": "🧷",
  "Router Purchase": "📶",
  Office: "🏢",
  "Tea & Snacks": "☕",
  Maintenance: "🛠️",
  Transport: "🚚",
  // Shared
  Miscellaneous: "🗂️",
}

export function categoryEmoji(name: string, type: TxType): string {
  return CATEGORY_EMOJI[name] ?? (type === "income" ? "💰" : "📦")
}
