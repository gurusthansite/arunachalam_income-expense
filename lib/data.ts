import 'server-only'
import * as excelStorage from '@/lib/excel-storage'
import { fetchGoogleSheetsData, getGoogleSheetsScriptUrl } from '@/lib/google-sheets'
import { toPaise } from '@/lib/money'
import { todayIso } from '@/lib/dates'
import type {
  Category,
  CategoryTotal,
  CategoryWithUsage,
  FinancialSummary,
  Member,
  OrgSettings,
  PaymentMethodTotal,
  PeriodTotal,
  PersonTotal,
  Transaction,
  TxType,
} from '@/lib/types'
import { PAYMENT_METHODS, paymentMethodLabel, getTxPaidPaise, getTxPendingPaise, getTxPaymentStatus } from '@/lib/types'

export type { AuditEntry } from '@/lib/excel-storage'

function normalizeDate(val: any): string {
  if (!val) return todayIso()
  const str = String(val)
  if (str.length >= 10 && str.includes('-')) return str.slice(0, 10)
  const dt = new Date(val)
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  return todayIso()
}

export async function getSettings(): Promise<OrgSettings> {
  const gData = await fetchGoogleSheetsData()
  if (gData?.settings) {
    return {
      organization_name: gData.settings.organization_name || 'My Organization',
      logo_url: gData.settings.logo_url || null,
      openingBalancePaise: toPaise(gData.settings.opening_balance),
      opening_balance_date: normalizeDate(gData.settings.opening_balance_date),
      financial_year_start_month: Number(gData.settings.financial_year_start_month) || 4,
    }
  }
  return excelStorage.getSettings()
}

export async function getCategories(opts?: { activeOnly?: boolean }): Promise<Category[]> {
  const gData = await fetchGoogleSheetsData()
  if (gData?.categories && Array.isArray(gData.categories)) {
    let list: Category[] = gData.categories.map((c: any) => ({
      id: String(c.id),
      name: String(c.name),
      type: String(c.type).toLowerCase() as TxType,
      is_active: Boolean(c.is_active),
    }))
    if (opts?.activeOnly) {
      list = list.filter((c) => c.is_active)
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return excelStorage.getCategories(opts)
}

function mapGTransactions(rawList: any[]): Transaction[] {
  return rawList.map((t: any) => {
    let contact = t.contact_number ? String(t.contact_number).replace(/^'/, '').trim() : null
    if (contact === '#ERROR!' || contact === '') contact = null

    const totalPaise = toPaise(t.amount)
    const isExpense = String(t.type || 'expense').toLowerCase() === 'expense'

    // Detect shifted rows (e.g. if category_name is a payment method like 'upi', or paid is text like 'Other Expenses')
    const rawPaidStr = String(t.paid ?? '').trim()
    const rawCatStr = String(t.category_name ?? '').trim().toLowerCase()
    const isShifted =
      (isNaN(Number(t.paid)) && rawPaidStr !== '') ||
      ['upi', 'cash', 'bank transfer', 'bank_transfer', 'cheque'].includes(rawCatStr)

    let categoryName = String(t.category_name || 'Uncategorized')
    let personName = t.person_name ? String(t.person_name) : null
    let paymentMethod = String(t.payment_method || 'Cash')
    let paidPaise: number
    let pendingPaise: number

    if (isShifted) {
      if (isNaN(Number(t.paid)) && rawPaidStr !== '') {
        categoryName = rawPaidStr
      }
      if (t.pending && typeof t.pending === 'string' && isNaN(Number(t.pending))) {
        personName = t.pending.trim()
      }
      if (['upi', 'cash', 'bank transfer', 'bank_transfer', 'cheque'].includes(rawCatStr)) {
        paymentMethod = t.category_name
      }
      paidPaise = totalPaise
      pendingPaise = 0
    } else {
      if (t.paid !== undefined && t.paid !== null && String(t.paid).trim() !== '' && !isNaN(Number(t.paid))) {
        paidPaise = toPaise(t.paid)
      } else if (t.paid_amount !== undefined && t.paid_amount !== null && String(t.paid_amount).trim() !== '' && !isNaN(Number(t.paid_amount))) {
        paidPaise = toPaise(t.paid_amount)
      } else {
        paidPaise = totalPaise
      }

      if (t.pending !== undefined && t.pending !== null && String(t.pending).trim() !== '' && !isNaN(Number(t.pending))) {
        pendingPaise = toPaise(t.pending)
      } else if (t.pending_amount !== undefined && t.pending_amount !== null && String(t.pending_amount).trim() !== '' && !isNaN(Number(t.pending_amount))) {
        pendingPaise = toPaise(t.pending_amount)
      } else {
        pendingPaise = isExpense ? Math.max(0, totalPaise - paidPaise) : 0
      }
    }

    return {
      id: String(t.id),
      transaction_date: normalizeDate(t.transaction_date),
      type: String(t.type || 'expense').toLowerCase() as TxType,
      amountPaise: totalPaise,
      paidPaise,
      pendingPaise,
      category_id: String(t.category_id || categoryName),
      category_name: categoryName,
      person_name: personName,
      contact_number: contact,
      payment_method: paymentMethod,
      reference_number: t.reference_number ? String(t.reference_number) : null,
      description: t.description ? String(t.description) : null,
    }
  })
}

export async function getCategoriesWithUsage(): Promise<CategoryWithUsage[]> {
  const gData = await fetchGoogleSheetsData()
  if (gData?.categories) {
    const categories: Category[] = gData.categories.map((c: any) => ({
      id: String(c.id),
      name: String(c.name),
      type: String(c.type).toLowerCase() as TxType,
      is_active: Boolean(c.is_active),
    }))
    const transactions = mapGTransactions(gData.transactions || [])
    const usageMap = new Map<string, number>()
    transactions.forEach((tx) => {
      const key = tx.category_name.toLowerCase()
      usageMap.set(key, (usageMap.get(key) ?? 0) + 1)
    })

    return categories.map((c) => ({
      ...c,
      usage_count: usageMap.get(c.name.toLowerCase()) ?? 0,
    }))
  }

  return excelStorage.getCategoriesWithUsage()
}

export async function getSummary(from: string | null, to: string | null): Promise<FinancialSummary> {
  const gData = await fetchGoogleSheetsData()
  if (gData) {
    const settings = {
      openingBalancePaise: toPaise(gData.settings?.opening_balance),
    }
    const all = mapGTransactions(gData.transactions || [])

    let priorNet = 0
    let income = 0
    let paidExpense = 0
    let totalExpense = 0
    let pendingExpense = 0
    let count = 0

    for (const t of all) {
      const isIncome = t.type === 'income'
      const paid = getTxPaidPaise(t)
      const pending = getTxPendingPaise(t)

      if (from && t.transaction_date < from) {
        if (isIncome) priorNet += paid
        else priorNet -= paid
      }

      const afterOrEqualFrom = !from || t.transaction_date >= from
      const beforeOrEqualTo = !to || t.transaction_date <= to

      if (afterOrEqualFrom && beforeOrEqualTo) {
        if (isIncome) {
          income += t.amountPaise
        } else {
          totalExpense += t.amountPaise
          paidExpense += paid
          pendingExpense += pending
        }
        count++
      }
    }

    const orgOpening = settings.openingBalancePaise
    const periodOpening = orgOpening + priorNet

    return {
      orgOpeningPaise: orgOpening,
      periodOpeningPaise: periodOpening,
      incomePaise: income,
      expensePaise: paidExpense, // Actual cash outflow
      totalExpensePaise: totalExpense, // Total incurred bill amount
      pendingExpensePaise: pendingExpense, // Pending payable
      closingPaise: periodOpening + income - paidExpense,
      transactionCount: count,
    }
  }

  return excelStorage.getSummary(from, to)
}

export async function getPeriodTotals(
  from: string | null,
  to: string | null,
  granularity: 'day' | 'month'
): Promise<PeriodTotal[]> {
  const gData = await fetchGoogleSheetsData()
  if (gData) {
    const all = mapGTransactions(gData.transactions || [])
    const map = new Map<string, { incomePaise: number; expensePaise: number }>()

    for (const t of all) {
      if (from && t.transaction_date < from) continue
      if (to && t.transaction_date > to) continue

      const period =
        granularity === 'day'
          ? t.transaction_date
          : t.transaction_date.slice(0, 7)

      if (!map.has(period)) {
        map.set(period, { incomePaise: 0, expensePaise: 0 })
      }
      const rec = map.get(period)!
      if (t.type === 'income') rec.incomePaise += t.amountPaise
      else rec.expensePaise += getTxPaidPaise(t)
    }

    const result: PeriodTotal[] = []
    for (const [period, data] of map.entries()) {
      result.push({ period, incomePaise: data.incomePaise, expensePaise: data.expensePaise })
    }
    return result.sort((a, b) => a.period.localeCompare(b.period))
  }

  return excelStorage.getPeriodTotals(from, to, granularity)
}

export async function getCategoryTotals(
  from: string | null,
  to: string | null,
  type: TxType
): Promise<CategoryTotal[]> {
  const gData = await fetchGoogleSheetsData()
  if (gData) {
    const all = mapGTransactions(gData.transactions || [])
    const map = new Map<string, { category_name: string; totalPaise: number; count: number }>()

    for (const t of all) {
      if (t.type !== type) continue
      if (from && t.transaction_date < from) continue
      if (to && t.transaction_date > to) continue

      const name = t.category_name || 'Uncategorized'
      if (!map.has(name)) {
        map.set(name, { category_name: name, totalPaise: 0, count: 0 })
      }
      const rec = map.get(name)!
      rec.totalPaise += t.amountPaise
      rec.count += 1
    }

    const result: CategoryTotal[] = []
    for (const [name, data] of map.entries()) {
      result.push({
        category_id: name,
        category_name: data.category_name,
        totalPaise: data.totalPaise,
        count: data.count,
      })
    }
    return result.sort((a, b) => b.totalPaise - a.totalPaise)
  }

  return excelStorage.getCategoryTotals(from, to, type)
}

export async function getPersonTotals(
  from: string | null,
  to: string | null,
  type: TxType
): Promise<PersonTotal[]> {
  const gData = await fetchGoogleSheetsData()
  if (gData) {
    const all = mapGTransactions(gData.transactions || [])
    const map = new Map<string, { totalPaise: number; count: number }>()

    for (const t of all) {
      if (t.type !== type) continue
      if (!t.person_name || !t.person_name.trim()) continue
      if (from && t.transaction_date < from) continue
      if (to && t.transaction_date > to) continue

      const name = t.person_name.trim()
      if (!map.has(name)) {
        map.set(name, { totalPaise: 0, count: 0 })
      }
      const rec = map.get(name)!
      rec.totalPaise += t.amountPaise
      rec.count += 1
    }

    const result: PersonTotal[] = []
    for (const [name, data] of map.entries()) {
      result.push({ person_name: name, totalPaise: data.totalPaise, count: data.count })
    }
    return result.sort((a, b) => b.totalPaise - a.totalPaise)
  }

  return excelStorage.getPersonTotals(from, to, type)
}

export async function getPaymentMethodTotals(
  from: string | null,
  to: string | null
): Promise<PaymentMethodTotal[]> {
  const gData = await fetchGoogleSheetsData()
  const all = gData
    ? mapGTransactions(gData.transactions || [])
    : (await excelStorage.getStatement(from, to)).rows

  const map = new Map<string, { incomePaise: number; expensePaise: number; count: number }>()
  for (const m of PAYMENT_METHODS) {
    map.set(m.value, { incomePaise: 0, expensePaise: 0, count: 0 })
  }

  for (const t of all) {
    if (from && t.transaction_date < from) continue
    if (to && t.transaction_date > to) continue

    const key = t.payment_method.toLowerCase().replace(/\s+/g, '_')
    if (!map.has(key)) {
      map.set(key, { incomePaise: 0, expensePaise: 0, count: 0 })
    }
    const rec = map.get(key)!
    if (t.type === 'income') rec.incomePaise += t.amountPaise
    else rec.expensePaise += t.amountPaise
    rec.count += 1
  }

  const result: PaymentMethodTotal[] = []
  for (const [key, data] of map.entries()) {
    if (data.count > 0 || ['cash', 'upi', 'bank_transfer'].includes(key)) {
      result.push({
        method: key,
        label: paymentMethodLabel(key),
        incomePaise: data.incomePaise,
        expensePaise: data.expensePaise,
        count: data.count,
      })
    }
  }

  return result
}

export async function getRecentTransactions(limit = 8): Promise<Transaction[]> {
  const gData = await fetchGoogleSheetsData()
  if (gData) {
    const all = mapGTransactions(gData.transactions || [])
    all.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    return all.slice(0, limit)
  }
  return excelStorage.getRecentTransactions(limit)
}

export type { TransactionFilters } from '@/lib/excel-storage'

export async function getTransactions(filters: excelStorage.TransactionFilters) {
  const gData = await fetchGoogleSheetsData()
  if (gData) {
    let all = mapGTransactions(gData.transactions || [])

    if (filters.type) {
      all = all.filter((t) => t.type === filters.type)
    }
    if (filters.status && filters.status !== 'all') {
      all = all.filter((t) => getTxPaymentStatus(t) === filters.status)
    }
    if (filters.categoryId) {
      const catIdLower = filters.categoryId.toLowerCase()
      all = all.filter(
        (t) =>
          t.category_id === filters.categoryId ||
          t.category_name.toLowerCase() === catIdLower
      )
    }
    if (filters.from) {
      all = all.filter((t) => t.transaction_date >= filters.from!)
    }
    if (filters.to) {
      all = all.filter((t) => t.transaction_date <= filters.to!)
    }
    if (filters.q) {
      const q = filters.q.toLowerCase()
      all = all.filter(
        (t) =>
          t.category_name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.person_name && t.person_name.toLowerCase().includes(q)) ||
          (t.contact_number && t.contact_number.toLowerCase().includes(q)) ||
          (t.reference_number && t.reference_number.toLowerCase().includes(q))
      )
    }

    all.sort((a, b) => {
      if (filters.sort === 'amount') {
        const diff = a.amountPaise - b.amountPaise
        return filters.dir === 'asc' ? diff : -diff
      } else {
        const diff = a.transaction_date.localeCompare(b.transaction_date)
        return filters.dir === 'asc' ? diff : -diff
      }
    })

    const total = all.length
    const start = (filters.page - 1) * filters.pageSize
    const rows = all.slice(start, start + filters.pageSize)

    return { rows, total }
  }

  return excelStorage.getTransactions(filters)
}

export async function getStatement(from: string | null, to: string | null) {
  const gData = await fetchGoogleSheetsData()
  if (gData) {
    let all = mapGTransactions(gData.transactions || [])
    if (from) all = all.filter((t) => t.transaction_date >= from)
    if (to) all = all.filter((t) => t.transaction_date <= to)
    all.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
    return { rows: all, truncated: false }
  }
  return excelStorage.getStatement(from, to)
}

export async function getMembers(): Promise<Member[]> {
  return [
    {
      user_id: 'sheet_admin',
      email: 'organization@google-sheets.app',
      role: 'admin',
      created_at: new Date().toISOString(),
    },
  ]
}

export async function getAuditLog(limit = 30) {
  return excelStorage.getAuditLog(limit)
}
