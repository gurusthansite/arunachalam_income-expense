// All arithmetic is done in integer paise to avoid floating-point drift.
// Postgres numeric(14,2) values arrive as JSON numbers/strings and are
// converted to paise immediately.

export type Paise = number

export function toPaise(value: number | string | null | undefined): Paise {
  if (value === null || value === undefined || value === '') return 0
  const str = typeof value === 'number' ? value.toFixed(2) : value.trim()
  const negative = str.startsWith('-')
  const [whole, frac = ''] = str.replace('-', '').split('.')
  const paise =
    Number.parseInt(whole || '0', 10) * 100 +
    Number.parseInt((frac + '00').slice(0, 2), 10)
  return negative ? -paise : paise
}

export function paiseToDecimalString(paise: Paise): string {
  const negative = paise < 0
  const abs = Math.abs(paise)
  const rupees = Math.floor(abs / 100)
  const rem = String(abs % 100).padStart(2, '0')
  return `${negative ? '-' : ''}${rupees}.${rem}`
}

export function paiseToNumber(paise: Paise): number {
  return Number(paiseToDecimalString(paise))
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const inrWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const plainIndianFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** ₹1,25,000.00 */
export function formatINR(paise: Paise): string {
  return inrFormatter.format(paiseToNumber(paise))
}

/** ₹1,25,000 — for chart axes and compact displays */
export function formatINRWhole(paise: Paise): string {
  return inrWholeFormatter.format(Math.round(paise / 100))
}

/** Rs. 1,25,000.00 — for PDFs whose built-in fonts lack the ₹ glyph */
export function formatINRAscii(paise: Paise): string {
  const sign = paise < 0 ? '-' : ''
  return `${sign}Rs. ${plainIndianFormatter.format(Math.abs(paiseToNumber(paise)))}`
}

export const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/
export const SIGNED_AMOUNT_PATTERN = /^-?\d{1,12}(\.\d{1,2})?$/

export function normalizeAmountInput(raw: string): string {
  return raw.replace(/[,\s₹]/g, '').trim()
}
