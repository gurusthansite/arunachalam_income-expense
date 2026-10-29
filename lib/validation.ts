import { z } from 'zod'
import { AMOUNT_PATTERN, SIGNED_AMOUNT_PATTERN, normalizeAmountInput } from './money'
import { isIsoDate } from './dates'
import { PAYMENT_METHODS } from './types'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null)

const isoDate = z
  .string()
  .refine((v) => isIsoDate(v), 'Enter a valid date')

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  transaction_date: isoDate,
  amount: z
    .string()
    .transform(normalizeAmountInput)
    .refine((v) => SIGNED_AMOUNT_PATTERN.test(v), 'Enter a valid amount with up to 2 decimals'),
  category_id: z.string().min(1, 'Select a category'),
  payment_method: z.enum(
    PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]],
    { message: 'Select a payment method' },
  ),
  person_name: optionalText(120),
  contact_number: optionalText(30),
  description: optionalText(500),
  reference_number: optionalText(60),
})

export type TransactionInput = z.input<typeof transactionSchema>

export const settingsSchema = z.object({
  organization_name: z.string().trim().min(1, 'Organization name is required').max(120),
  logo_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https:\/\/\S+$/i.test(v), 'Logo must be an https:// URL')
    .transform((v) => (v === '' ? null : v)),
  opening_balance: z
    .string()
    .transform(normalizeAmountInput)
    .refine((v) => SIGNED_AMOUNT_PATTERN.test(v), 'Enter a valid amount with up to 2 decimals'),
  opening_balance_date: isoDate,
  financial_year_start_month: z.coerce.number().int().min(1).max(12),
})

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
  type: z.enum(['income', 'expense']),
})

export const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(['admin', 'member']),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password').max(72),
})

export const setupSchema = memberSchema.omit({ role: true }).extend({
  organization_name: z.string().trim().min(1, 'Organization name is required').max(120),
})

export function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
