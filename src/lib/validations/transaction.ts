import { z } from "zod"

export const txFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .min(1, "Enter an amount")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Enter a valid amount"),
  category_id: z.string().uuid("Pick a category"),
  note: z.string().trim().max(200).optional().or(z.literal("")),
  date: z.string().min(1, "Pick a date"),
})

export type TxFormValues = z.infer<typeof txFormSchema>

/** Maps validated form values to a row for the income/expenses tables. */
export function toTransactionRow(values: TxFormValues, userId: string) {
  return {
    txn_date: values.date,
    category_id: values.category_id,
    amount: Number(values.amount),
    payment_mode: "cash" as const,
    description: values.note?.trim() ? values.note.trim() : null,
    created_by: userId,
  }
}
