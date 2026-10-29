export type TxType = 'income' | 'expense'

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value
}

export type Category = {
  id: string
  name: string
  type: TxType
  is_active: boolean
}

export type CategoryWithUsage = Category & { usage_count: number }

/** Transaction with amount already converted to integer paise. */
export type Transaction = {
  id: string
  transaction_date: string
  type: TxType
  amountPaise: number
  category_id: string
  category_name: string
  person_name: string | null
  payment_method: string
  description: string | null
  reference_number: string | null
}

export type OrgSettings = {
  organization_name: string
  logo_url: string | null
  openingBalancePaise: number
  opening_balance_date: string
  financial_year_start_month: number
}

export type FinancialSummary = {
  orgOpeningPaise: number
  periodOpeningPaise: number
  incomePaise: number
  expensePaise: number
  closingPaise: number
  transactionCount: number
}

export type PeriodTotal = {
  period: string
  incomePaise: number
  expensePaise: number
}

export type CategoryTotal = {
  category_id: string
  category_name: string
  totalPaise: number
  count: number
}

export type PersonTotal = {
  person_name: string
  totalPaise: number
  count: number
}

export type PaymentMethodTotal = {
  method: string
  label: string
  incomePaise: number
  expensePaise: number
  count: number
}

export type Member = {
  user_id: string
  email: string
  role: 'admin' | 'member'
  created_at: string
}

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
