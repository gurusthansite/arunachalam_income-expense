import type { PaymentInstallment, Transaction } from '@/lib/types'
import { toPaise, paiseToDecimalString } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { paymentMethodLabel } from '@/lib/types'

const PAYMENTS_TAG_START = '<!--PAYMENTS_DATA:'
const PAYMENTS_TAG_END = '-->'
const META_TAG_START = '<!--META:'
const META_TAG_END = '-->'

export type TransactionMetadata = {
  referred_by?: string | null
  referred_contact?: string | null
  paid_by?: string | null
}

/**
 * Decodes metadata (referred_by, referred_contact, paid_by) from the raw description string
 */
export function decodeTransactionMetadata(rawDesc: string | null | undefined): TransactionMetadata {
  const result: TransactionMetadata = {
    referred_by: null,
    referred_contact: null,
    paid_by: null,
  }

  if (!rawDesc) return result

  // 1. Try structured META tag first
  const metaStart = rawDesc.indexOf(META_TAG_START)
  if (metaStart !== -1) {
    const metaEnd = rawDesc.indexOf(META_TAG_END, metaStart)
    if (metaEnd !== -1) {
      try {
        const json = rawDesc.slice(metaStart + META_TAG_START.length, metaEnd)
        const parsed = JSON.parse(json)
        if (parsed && typeof parsed === 'object') {
          if (parsed.referred_by) result.referred_by = String(parsed.referred_by).trim() || null
          if (parsed.referred_contact) result.referred_contact = String(parsed.referred_contact).trim() || null
          if (parsed.paid_by) result.paid_by = String(parsed.paid_by).trim() || null
        }
      } catch (err) {
        console.warn('Failed to parse metadata tag from description:', err)
      }
    }
  }

  // 2. Fallback: Parse human-readable brackets if tag not found
  if (!result.referred_by) {
    const refMatch = rawDesc.match(/\[Referred\s*by:\s*([^(]+?)(?:\s*\(([^)]+)\))?\s*\]/i)
    if (refMatch) {
      result.referred_by = refMatch[1].trim()
      if (refMatch[2] && !result.referred_contact) {
        result.referred_contact = refMatch[2].trim()
      }
    }
  }

  if (!result.paid_by) {
    const paidMatch = rawDesc.match(/\[Paid\s*by:\s*([^\]]+)\]/i)
    if (paidMatch) {
      result.paid_by = paidMatch[1].trim()
    }
  }

  return result
}

/**
 * Decodes installments from description, or synthesizes Payment #1 if an advance was recorded previously
 */
export function decodePayments(
  rawDesc: string | null | undefined,
  tx?: Partial<Transaction>
): PaymentInstallment[] {
  if (rawDesc) {
    const startIdx = rawDesc.indexOf(PAYMENTS_TAG_START)
    const endIdx = rawDesc.indexOf(PAYMENTS_TAG_END, startIdx)
    if (startIdx !== -1 && endIdx !== -1) {
      try {
        const json = rawDesc.slice(startIdx + PAYMENTS_TAG_START.length, endIdx)
        const parsed = JSON.parse(json)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            ...item,
            paidBy: item.paidBy || item.paid_by || null,
          }))
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
        paidBy: tx.paid_by || null,
        note: 'Initial / Advance Payment',
      },
    ]
  }

  return []
}

/**
 * Strips out internal metadata tags, audit trail blocks, and prefix labels so regular user notes display cleanly
 */
export function cleanDescription(rawDesc: string | null | undefined): string | null {
  if (!rawDesc) return null
  let text = rawDesc

  const paymentsIdx = text.indexOf(PAYMENTS_TAG_START)
  if (paymentsIdx !== -1) {
    text = text.slice(0, paymentsIdx)
  }

  const metaIdx = text.indexOf(META_TAG_START)
  if (metaIdx !== -1) {
    text = text.slice(0, metaIdx)
  }

  const auditIdx = text.indexOf('[Payment Audit Trail]')
  if (auditIdx !== -1) {
    text = text.slice(0, auditIdx)
  }

  // Remove bracketed prefixes: [Referred by: ...] and [Paid by: ...]
  text = text.replace(/\[Referred\s*by:[^\]]*\]/gi, '')
  text = text.replace(/\[Paid\s*by:[^\]]*\]/gi, '')

  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Encodes full description with clean user notes, metadata tags, human-readable labels, and installment audit trail
 */
export function encodeFullDescription(opts: {
  cleanNotes: string | null | undefined
  metadata?: TransactionMetadata | null
  payments?: PaymentInstallment[] | null
}): string {
  const notes = cleanDescription(opts.cleanNotes) || ''
  const meta = opts.metadata

  const prefixes: string[] = []
  if (meta?.referred_by) {
    const contactPart = meta.referred_contact ? ` (${meta.referred_contact})` : ''
    prefixes.push(`[Referred by: ${meta.referred_by}${contactPart}]`)
  }
  if (meta?.paid_by) {
    prefixes.push(`[Paid by: ${meta.paid_by}]`)
  }

  const prefixBlock = prefixes.join(' ')
  const mainBody = prefixBlock ? (notes ? `${prefixBlock} ${notes}` : prefixBlock) : notes

  let metaTag = ''
  if (meta && (meta.referred_by || meta.referred_contact || meta.paid_by)) {
    metaTag = `${META_TAG_START}${JSON.stringify({
      referred_by: meta.referred_by || null,
      referred_contact: meta.referred_contact || null,
      paid_by: meta.paid_by || null,
    })}${META_TAG_END}`
  }

  let paymentsBlock = ''
  if (opts.payments && opts.payments.length > 0) {
    const paymentsJson = `${PAYMENTS_TAG_START}${JSON.stringify(opts.payments)}${PAYMENTS_TAG_END}`
    const humanList = opts.payments
      .map((p) => {
        const amtStr = `₹${(p.amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        const method = paymentMethodLabel(p.paymentMethod)
        const dateStr = formatDate(p.date)
        const payerPart = (p.paidBy || p.paid_by) ? ` (Paid by: ${p.paidBy || p.paid_by})` : ''
        const refPart = p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''
        const notePart = p.note ? ` — ${p.note}` : ''
        return `• Payment #${p.installmentNumber}: ${amtStr} via ${method} on ${dateStr}${payerPart}${refPart}${notePart}`
      })
      .join('\n')
    const auditBlock = `\n\n[Payment Audit Trail]\n${humanList}`
    paymentsBlock = `${paymentsJson}${auditBlock}`
  }

  const parts = [mainBody, metaTag, paymentsBlock].filter((p) => p && p.trim() !== '')
  return parts.join('\n\n')
}

/**
 * Backward-compatible helper for encoding payments
 */
export function encodePayments(
  cleanDesc: string | null | undefined,
  payments: PaymentInstallment[],
  metadata?: TransactionMetadata | null
): string {
  return encodeFullDescription({
    cleanNotes: cleanDesc,
    metadata,
    payments,
  })
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
