"use client"

import * as React from "react"

const KEY = "sbc_currency"
const DEFAULT = "₹"

export const CURRENCIES = [
  { value: "₹", label: "₹ INR" },
  { value: "$", label: "$ USD" },
  { value: "€", label: "€ EUR" },
  { value: "£", label: "£ GBP" },
  { value: "¥", label: "¥ JPY" },
  { value: "A$", label: "A$ AUD" },
]

type Ctx = { currency: string; setCurrency: (c: string) => void }

const CurrencyContext = React.createContext<Ctx>({
  currency: DEFAULT,
  setCurrency: () => {},
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState(DEFAULT)

  React.useEffect(() => {
    const saved = window.localStorage.getItem(KEY)
    if (saved) setCurrencyState(saved)
  }, [])

  const setCurrency = React.useCallback((c: string) => {
    setCurrencyState(c)
    window.localStorage.setItem(KEY, c)
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return React.useContext(CurrencyContext)
}
