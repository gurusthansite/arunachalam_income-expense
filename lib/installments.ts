import type { PaymentInstallment, Transaction } from '@/lib/types'
import { toPaise, paiseToDecimalString } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { paymentMethodLabel } from '@/lib/types'

const TAG_START = '<!--PAYMENTS_DATA:'
const TAG_END = '-->'

/**
 * Encodes an array of installments into a clean metadata tag + human readable audit log for Google Sheets
 */
export function encodePayments(cleanDesc: string | null | undefined, payments: PaymentInstallment[]): string {
  const base = cleanDesc ? cleanDesc.trim() : ''
  if (!payments || payments.length === 0) return base

  const jsonPayload = JSON.stringify(payments)
  const metaTag = `${TAG_START}${jsonPayload}${TAG_END}`

  const humanReadableList = payments
    .map((p) => {
      const amtStr = `₹${(p.amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      const method = paymentMethodLabel(p.paymentMethod)
      const dateStr = formatDate(p.date)
      const refPart = p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''
      const notePart = p.note ? ` — ${p.note}` : ''
      return `• Payment #${p.installmentNumber}: ${amtStr} via ${method} on ${dateStr}${refPart}${notePart}`
    })
    .join('\n')

  const auditBlock = `\n\n[Payment Audit Trail]\n${humanReadableList}`
  return `${base}${base ? '\n' : ''}${metaTag}${auditBlock}`
}

/**
 * Decodes installments from description, or synthesizes Payment #1 if an advance was recorded previously
 */
export function decodePayments(
  rawDesc: string | null | undefined,
  tx?: Partial<Transaction>
): PaymentInstallment[] {
  if (rawDesc) {
    const startIdx = rawDesc.indexOf(TAG_START)
    const endIdx = rawDesc.indexOf(TAG_END, startIdx)
    if (startIdx !== -1 && endIdx !== -1) {
      try {
        const json = rawDesc.slice(startIdx + TAG_START.length, endIdx)
        const parsed = JSON.parse(json)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch (err) {
        console.warn('Failed to parse payments metadata from description:', err)
      }
    }
  }

  // Fallback: If no explicit history tag exists yet, but there was an initial paid amount:
  if (tx && tx.paidPaise && tx.paidPaise > 0 && tx.pendingPaise && tx.pendingPaise > 0) {
    return [
      {
        installmentNumber: 1,
        amountPaise: tx.paidPaise,
        date: tx.transaction_date || new Date().toISOString().slice(0, 10),
        paymentMethod: tx.payment_method || 'cash',
        referenceNumber: tx.reference_number || null,
        note: 'Initial / Advance Payment',
      },
    ]
  }

  return []
}

/**
 * Strips out the internal payment tag and audit trail block so regular user notes display cleanly
 */
export function cleanDescription(rawDesc: string | null | undefined): string | null {
  if (!rawDesc) return null
  let text = rawDesc

  const metaIdx = text.indexOf(TAG_START)
  if (metaIdx !== -1) {
    text = text.slice(0, metaIdx)
  }

  const auditIdx = text.indexOf('[Payment Audit Trail]')
  if (auditIdx !== -1) {
    text = text.slice(0, auditIdx)
  }

  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Computes a consolidated payment method display label (e.g. "Cash + UPI" if multiple methods used)
 */
export function getConsolidatedMethod(payments: PaymentInstallment[], fallback: string): string {
  if (!payments || payments.length === 0) return fallback
  const uniqueMethods = Array.from(new Set(payments.map((p) => paymentMethodLabel(p.paymentMethod))))
  if (uniqueMethods.length === 1) return uniqueMethods[0]
  return uniqueMethods.join(' + ')
}
