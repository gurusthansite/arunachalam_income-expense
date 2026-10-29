// Dates are handled as 'YYYY-MM-DD' strings in the organization's local
// timezone (India) to avoid UTC off-by-one errors.

export const APP_TIMEZONE = 'Asia/Kolkata'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  )
}

export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function toIso(dt: Date): string {
  return dt.toISOString().slice(0, 10)
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

export function startOfMonth(iso: string): string {
  const { y, m } = parts(iso)
  return toIso(new Date(Date.UTC(y, m - 1, 1)))
}

export function endOfMonth(iso: string): string {
  const { y, m } = parts(iso)
  return toIso(new Date(Date.UTC(y, m, 0)))
}

export function addMonths(iso: string, n: number): string {
  const { y, m } = parts(iso)
  return toIso(new Date(Date.UTC(y, m - 1 + n, 1)))
}

export function daysBetween(from: string, to: string): number {
  const a = parts(from)
  const b = parts(to)
  return Math.round(
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000,
  )
}

/** Financial year containing `iso`, given a start month (1-12). */
export function financialYearRange(iso: string, startMonth: number) {
  const { y, m } = parts(iso)
  const startYear = m >= startMonth ? y : y - 1
  const from = toIso(new Date(Date.UTC(startYear, startMonth - 1, 1)))
  const to = toIso(new Date(Date.UTC(startYear + 1, startMonth - 1, 0)))
  return { from, to }
}

export function financialYearLabel(iso: string, startMonth: number): string {
  const { from, to } = financialYearRange(iso, startMonth)
  const fy = from.slice(0, 4)
  const ty = to.slice(0, 4)
  return fy === ty ? `FY ${fy}` : `FY ${fy}-${ty.slice(2)}`
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const monthFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const monthShortFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  timeZone: 'UTC',
})

function isoToUtcDate(iso: string) {
  const { y, m, d } = parts(iso)
  return new Date(Date.UTC(y, m - 1, d))
}

export function formatDate(iso: string): string {
  return dateFormatter.format(isoToUtcDate(iso))
}

export function formatMonth(iso: string): string {
  return monthFormatter.format(isoToUtcDate(iso))
}

export function formatMonthShort(iso: string): string {
  return monthShortFormatter.format(isoToUtcDate(iso))
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export type RangePreset = 'month' | 'last-month' | 'fy' | 'all' | 'custom'

export type DateRange = {
  preset: RangePreset
  from: string | null
  to: string | null
  label: string
}

export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  fyStartMonth: number,
  defaultPreset: RangePreset,
): DateRange {
  const today = todayIso()
  const preset = (
    ['month', 'last-month', 'fy', 'all', 'custom'].includes(params.range ?? '')
      ? params.range
      : defaultPreset
  ) as RangePreset

  switch (preset) {
    case 'month':
      return {
        preset,
        from: startOfMonth(today),
        to: endOfMonth(today),
        label: formatMonth(today),
      }
    case 'last-month': {
      const lm = addMonths(today, -1)
      return {
        preset,
        from: startOfMonth(lm),
        to: endOfMonth(lm),
        label: formatMonth(lm),
      }
    }
    case 'fy': {
      const { from, to } = financialYearRange(today, fyStartMonth)
      return { preset, from, to, label: financialYearLabel(today, fyStartMonth) }
    }
    case 'all':
      return { preset, from: null, to: null, label: 'All time' }
    case 'custom': {
      let from = isIsoDate(params.from) ? params.from : null
      let to = isIsoDate(params.to) ? params.to : null
      if (from && to && from > to) [from, to] = [to, from]
      const label =
        from && to
          ? `${formatDate(from)} – ${formatDate(to)}`
          : from
            ? `From ${formatDate(from)}`
            : to
              ? `Up to ${formatDate(to)}`
              : 'All time'
      return { preset, from, to, label }
    }
  }
}
