import type { Metadata } from "next"

import { IncomeView } from "./income-view"

export const metadata: Metadata = { title: "Income" }

export default function IncomePage() {
  return <IncomeView />
}
