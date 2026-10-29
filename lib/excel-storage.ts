import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { toPaise } from '@/lib/money'
import { todayIso } from '@/lib/dates'
import type {
  Category,
  CategoryTotal,
  CategoryWithUsage,
  FinancialSummary,
  OrgSettings,
  PeriodTotal,
  PersonTotal,
  Transaction,
  TxType,
} from '@/lib/types'

export type AuditEntry = {
  id: number
  table_name: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  record_id: string
  user_email: string | null
  created_at: string
  summary: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const LEDGER_PATH = path.join(DATA_DIR, 'ledger.xlsx')

function generateId(): string {
  return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9)
}

function generateCategoryId(): string {
  return 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7)
}

// In-memory queue strictly for write mutations to prevent file-write collisions
let writeQueue = Promise.resolve()
function mutate<T>(op: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(op)
  writeQueue = result.then(() => {}, () => {})
  return result
}

// Default initial categories
const DEFAULT_CATEGORIES: { name: string; type: TxType; is_active: boolean }[] = [
  { name: 'Donations', type: 'income', is_active: true },
  { name: 'Contributions', type: 'income', is_active: true },
  { name: 'Grants', type: 'income', is_active: true },
  { name: 'Membership Fees', type: 'income', is_active: true },
  { name: 'Other Income', type: 'income', is_active: true },
  { name: 'Food', type: 'expense', is_active: true },
  { name: 'Travel', type: 'expense', is_active: true },
  { name: 'Rent', type: 'expense', is_active: true },
  { name: 'Electricity and Utilities', type: 'expense', is_active: true },
  { name: 'Printing and Stationery', type: 'expense', is_active: true },
  { name: 'Event Expenses', type: 'expense', is_active: true },
  { name: 'Salaries and Honorariums', type: 'expense', is_active: true },
  { name: 'Maintenance', type: 'expense', is_active: true },
  { name: 'Other Expenses', type: 'expense', is_active: true },
]

export function getLedgerFilePath(): string {
  return LEDGER_PATH
}

export async function ensureLedgerFile(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (fs.existsSync(LEDGER_PATH)) {
    return
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Ledger Organization Manager'
  workbook.created = new Date()

  // 1. Transactions Sheet
  const txSheet = workbook.addWorksheet('Transactions')
  txSheet.columns = [
    { header: 'ID', key: 'id', width: 22 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Amount', key: 'amount', width: 16 },
    { header: 'CategoryID', key: 'category_id', width: 20 },
    { header: 'CategoryName', key: 'category_name', width: 26 },
    { header: 'PersonName', key: 'person_name', width: 24 },
    { header: 'PaymentMethod', key: 'payment_method', width: 16 },
    { header: 'ReferenceNumber', key: 'reference_number', width: 20 },
    { header: 'Description', key: 'description', width: 34 },
    { header: 'CreatedAt', key: 'created_at', width: 24 },
  ]
  txSheet.getRow(1).font = { bold: true }

  // 2. Categories Sheet
  const catSheet = workbook.addWorksheet('Categories')
  catSheet.columns = [
    { header: 'ID', key: 'id', width: 20 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'IsActive', key: 'is_active', width: 12 },
  ]
  catSheet.getRow(1).font = { bold: true }

  DEFAULT_CATEGORIES.forEach((c) => {
    catSheet.addRow({
      id: generateCategoryId(),
      name: c.name,
      type: c.type,
      is_active: 'TRUE',
    })
  })

  // 3. Settings Sheet
  const settingsSheet = workbook.addWorksheet('Settings')
  settingsSheet.columns = [
    { header: 'Key', key: 'key', width: 30 },
    { header: 'Value', key: 'value', width: 40 },
  ]
  settingsSheet.getRow(1).font = { bold: true }

  settingsSheet.addRow({ key: 'organization_name', value: 'My Organization' })
  settingsSheet.addRow({ key: 'logo_url', value: '' })
  settingsSheet.addRow({ key: 'opening_balance', value: '0.00' })
  settingsSheet.addRow({ key: 'opening_balance_date', value: todayIso() })
  settingsSheet.addRow({ key: 'financial_year_start_month', value: '4' })

  // 4. AuditLogs Sheet
  const auditSheet = workbook.addWorksheet('AuditLogs')
  auditSheet.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Timestamp', key: 'timestamp', width: 26 },
    { header: 'Action', key: 'action', width: 12 },
    { header: 'Entity', key: 'entity', width: 18 },
    { header: 'Summary', key: 'summary', width: 50 },
  ]
  auditSheet.getRow(1).font = { bold: true }
  auditSheet.addRow({
    id: 1,
    timestamp: new Date().toISOString(),
    action: 'INIT',
    entity: 'system',
    summary: 'Initialized new Excel ledger workbook',
  })

  await workbook.xlsx.writeFile(LEDGER_PATH)
}

async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  await ensureLedgerFile()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(LEDGER_PATH)
  return workbook
}

async function saveWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
  await workbook.xlsx.writeFile(LEDGER_PATH)
}

function cellValueToString(val: any): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object' && val.text) return String(val.text).trim()
  if (typeof val === 'object' && val.result !== undefined) return String(val.result).trim()
  return String(val).trim()
}

// ----------------- Internal Readers -----------------

function readSettingsFromWb(wb: ExcelJS.Workbook): OrgSettings {
  const sheet = wb.getWorksheet('Settings')
  const raw: Record<string, string> = {}

  if (sheet) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const key = cellValueToString(row.getCell(1).value)
      const val = cellValueToString(row.getCell(2).value)
      if (key) raw[key] = val
    })
  }

  return {
    organization_name: raw.organization_name || 'My Organization',
    logo_url: raw.logo_url || null,
    openingBalancePaise: toPaise(raw.opening_balance || '0'),
    opening_balance_date: raw.opening_balance_date || todayIso(),
    financial_year_start_month: Number(raw.financial_year_start_month || 4) || 4,
  }
}

function readCategoriesFromWb(wb: ExcelJS.Workbook, activeOnly?: boolean): Category[] {
  const sheet = wb.getWorksheet('Categories')
  const categories: Category[] = []

  if (sheet) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const id = cellValueToString(row.getCell(1).value)
      const name = cellValueToString(row.getCell(2).value)
      const type = cellValueToString(row.getCell(3).value).toLowerCase() as TxType
      const activeRaw = cellValueToString(row.getCell(4).value).toUpperCase()
      const is_active = activeRaw === 'TRUE' || activeRaw === '1' || activeRaw === 'YES'

      if (id && name) {
        if (!activeOnly || is_active) {
          categories.push({ id, name, type, is_active })
        }
      }
    })
  }

  return categories.sort((a, b) => a.name.localeCompare(b.name))
}

function readTransactionsFromWb(wb: ExcelJS.Workbook): Transaction[] {
  const sheet = wb.getWorksheet('Transactions')
  const transactions: Transaction[] = []
  if (sheet) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const id = cellValueToString(row.getCell(1).value)
      const transaction_date = cellValueToString(row.getCell(2).value)
      const type = cellValueToString(row.getCell(3).value).toLowerCase() as TxType
      const amountPaise = toPaise(row.getCell(4).value as any)

      if (id && transaction_date && amountPaise > 0) {
        transactions.push({
          id,
          transaction_date,
          type,
          amountPaise,
          category_id: cellValueToString(row.getCell(5).value),
          category_name: cellValueToString(row.getCell(6).value) || 'Uncategorized',
          person_name: cellValueToString(row.getCell(7).value) || null,
          payment_method: cellValueToString(row.getCell(8).value) || 'other',
          reference_number: cellValueToString(row.getCell(9).value) || null,
          description: cellValueToString(row.getCell(10).value) || null,
        })
      }
    })
  }
  return transactions
}

// ----------------- Public Getters (Concurrent & Deadlock-Free) -----------------

export async function getSettings(): Promise<OrgSettings> {
  const wb = await loadWorkbook()
  return readSettingsFromWb(wb)
}

export async function getCategories(opts?: { activeOnly?: boolean }): Promise<Category[]> {
  const wb = await loadWorkbook()
  return readCategoriesFromWb(wb, opts?.activeOnly)
}

export async function getCategoriesWithUsage(): Promise<CategoryWithUsage[]> {
  const wb = await loadWorkbook()
  const categories = readCategoriesFromWb(wb)
  const transactions = readTransactionsFromWb(wb)

  const usageMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.category_id) {
      usageMap.set(t.category_id, (usageMap.get(t.category_id) ?? 0) + 1)
    }
  }

  return categories.map((c) => ({
    ...c,
    usage_count: usageMap.get(c.id) ?? 0,
  }))
}

export type TransactionFilters = {
  q?: string
  type?: TxType
  categoryId?: string
  from?: string | null
  to?: string | null
  sort: 'date' | 'amount'
  dir: 'asc' | 'desc'
  page: number
  pageSize: number
}

export async function getTransactions(filters: TransactionFilters) {
  const wb = await loadWorkbook()
  let all = readTransactionsFromWb(wb)

  // Filters
  if (filters.type) {
    all = all.filter((t) => t.type === filters.type)
  }
  if (filters.categoryId) {
    all = all.filter((t) => t.category_id === filters.categoryId)
  }
  if (filters.from) {
    all = all.filter((t) => t.transaction_date >= filters.from!)
  }
  if (filters.to) {
    all = all.filter((t) => t.transaction_date <= filters.to!)
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    all = all.filter((t) => {
      return (
        t.category_name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.person_name && t.person_name.toLowerCase().includes(q)) ||
        (t.reference_number && t.reference_number.toLowerCase().includes(q))
      )
    })
  }

  // Sort
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

export async function getRecentTransactions(limit = 8): Promise<Transaction[]> {
  const wb = await loadWorkbook()
  const all = readTransactionsFromWb(wb)
  all.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
  return all.slice(0, limit)
}

export async function getSummary(from: string | null, to: string | null): Promise<FinancialSummary> {
  const wb = await loadWorkbook()
  const settings = readSettingsFromWb(wb)
  const all = readTransactionsFromWb(wb)

  let priorNet = 0
  let income = 0
  let expense = 0
  let count = 0

  for (const t of all) {
    if (from && t.transaction_date < from) {
      if (t.type === 'income') priorNet += t.amountPaise
      else priorNet -= t.amountPaise
    }

    const afterOrEqualFrom = !from || t.transaction_date >= from
    const beforeOrEqualTo = !to || t.transaction_date <= to

    if (afterOrEqualFrom && beforeOrEqualTo) {
      if (t.type === 'income') income += t.amountPaise
      else expense += t.amountPaise
      count++
    }
  }

  const orgOpening = settings.openingBalancePaise
  const periodOpening = orgOpening + priorNet

  return {
    orgOpeningPaise: orgOpening,
    periodOpeningPaise: periodOpening,
    incomePaise: income,
    expensePaise: expense,
    closingPaise: periodOpening + income - expense,
    transactionCount: count,
  }
}

export async function getPeriodTotals(
  from: string | null,
  to: string | null,
  granularity: 'day' | 'month'
): Promise<PeriodTotal[]> {
  const wb = await loadWorkbook()
  const all = readTransactionsFromWb(wb)
  const map = new Map<string, { incomePaise: number; expensePaise: number }>()

  for (const t of all) {
    if (from && t.transaction_date < from) continue
    if (to && t.transaction_date > to) continue

    const period =
      granularity === 'day'
        ? t.transaction_date
        : t.transaction_date.slice(0, 7) // YYYY-MM

    if (!map.has(period)) {
      map.set(period, { incomePaise: 0, expensePaise: 0 })
    }

    const rec = map.get(period)!
    if (t.type === 'income') rec.incomePaise += t.amountPaise
    else rec.expensePaise += t.amountPaise
  }

  const result: PeriodTotal[] = []
  for (const [period, data] of map.entries()) {
    result.push({ period, incomePaise: data.incomePaise, expensePaise: data.expensePaise })
  }

  return result.sort((a, b) => a.period.localeCompare(b.period))
}

export async function getCategoryTotals(
  from: string | null,
  to: string | null,
  type: TxType
): Promise<CategoryTotal[]> {
  const wb = await loadWorkbook()
  const all = readTransactionsFromWb(wb)
  const map = new Map<string, { category_name: string; totalPaise: number; count: number }>()

  for (const t of all) {
    if (t.type !== type) continue
    if (from && t.transaction_date < from) continue
    if (to && t.transaction_date > to) continue

    const id = t.category_id || 'uncat'
    if (!map.has(id)) {
      map.set(id, {
        category_name: t.category_name || 'Uncategorized',
        totalPaise: 0,
        count: 0,
      })
    }
    const rec = map.get(id)!
    rec.totalPaise += t.amountPaise
    rec.count += 1
  }

  const result: CategoryTotal[] = []
  for (const [id, data] of map.entries()) {
    result.push({
      category_id: id,
      category_name: data.category_name,
      totalPaise: data.totalPaise,
      count: data.count,
    })
  }

  return result.sort((a, b) => b.totalPaise - a.totalPaise)
}

export async function getPersonTotals(
  from: string | null,
  to: string | null,
  type: TxType
): Promise<PersonTotal[]> {
  const wb = await loadWorkbook()
  const all = readTransactionsFromWb(wb)
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
    result.push({
      person_name: name,
      totalPaise: data.totalPaise,
      count: data.count,
    })
  }

  return result.sort((a, b) => b.totalPaise - a.totalPaise)
}

export async function getStatement(from: string | null, to: string | null) {
  const wb = await loadWorkbook()
  let all = readTransactionsFromWb(wb)
  if (from) all = all.filter((t) => t.transaction_date >= from)
  if (to) all = all.filter((t) => t.transaction_date <= to)
  all.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
  return { rows: all, truncated: false }
}

export async function getAuditLog(limit = 30): Promise<AuditEntry[]> {
  const wb = await loadWorkbook()
  const sheet = wb.getWorksheet('AuditLogs')
  const list: AuditEntry[] = []

  if (sheet) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      list.push({
        id: Number(cellValueToString(row.getCell(1).value)) || rowNumber,
        created_at: cellValueToString(row.getCell(2).value) || new Date().toISOString(),
        action: cellValueToString(row.getCell(3).value) as any,
        table_name: cellValueToString(row.getCell(4).value),
        record_id: String(rowNumber),
        user_email: 'local_user',
        summary: cellValueToString(row.getCell(5).value),
      })
    })
  }

  list.reverse()
  return list.slice(0, limit)
}

// ----------------- Mutations (Synchronized via mutate) -----------------

function addAuditEntry(
  workbook: ExcelJS.Workbook,
  action: string,
  entity: string,
  summary: string
) {
  let sheet = workbook.getWorksheet('AuditLogs')
  if (!sheet) {
    sheet = workbook.addWorksheet('AuditLogs')
    sheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Timestamp', key: 'timestamp' },
      { header: 'Action', key: 'action' },
      { header: 'Entity', key: 'entity' },
      { header: 'Summary', key: 'summary' },
    ]
  }
  const id = sheet.rowCount > 1 ? sheet.rowCount : 1
  sheet.addRow([id, new Date().toISOString(), action, entity, summary])
}

export async function updateSettings(input: Record<string, string>): Promise<void> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    let sheet = wb.getWorksheet('Settings')
    if (!sheet) {
      sheet = wb.addWorksheet('Settings')
      sheet.addRow(['Key', 'Value'])
    }

    const map = new Map<string, number>()
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const key = cellValueToString(row.getCell(1).value)
      if (key) map.set(key, rowNumber)
    })

    for (const [key, val] of Object.entries(input)) {
      if (map.has(key)) {
        const rowNum = map.get(key)!
        sheet.getRow(rowNum).getCell(2).value = val
      } else {
        sheet.addRow([key, val])
      }
    }

    addAuditEntry(wb, 'UPDATE', 'settings', `Updated organization settings`)
    await saveWorkbook(wb)
  })
}

export async function createCategory(input: { name: string; type: TxType }): Promise<Category> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    const sheet = wb.getWorksheet('Categories')
    if (!sheet) throw new Error('Categories sheet missing')

    let exists = false
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const name = cellValueToString(row.getCell(2).value)
      const type = cellValueToString(row.getCell(3).value).toLowerCase()
      if (name.toLowerCase() === input.name.trim().toLowerCase() && type === input.type) {
        exists = true
      }
    })
    if (exists) throw new Error(`Category "${input.name}" already exists`)

    const newCat: Category = {
      id: generateCategoryId(),
      name: input.name.trim(),
      type: input.type,
      is_active: true,
    }

    sheet.addRow([newCat.id, newCat.name, newCat.type, 'TRUE'])
    addAuditEntry(wb, 'INSERT', 'categories', `Added ${newCat.type} category "${newCat.name}"`)
    await saveWorkbook(wb)
    return newCat
  })
}

export async function renameCategory(id: string, newName: string): Promise<void> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    const catSheet = wb.getWorksheet('Categories')
    const txSheet = wb.getWorksheet('Transactions')
    if (!catSheet) throw new Error('Categories sheet missing')

    let found = false
    catSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      if (cellValueToString(row.getCell(1).value) === id) {
        row.getCell(2).value = newName.trim()
        found = true
      }
    })
    if (!found) throw new Error('Category not found')

    if (txSheet) {
      txSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        if (cellValueToString(row.getCell(5).value) === id) {
          row.getCell(6).value = newName.trim()
        }
      })
    }

    addAuditEntry(wb, 'UPDATE', 'categories', `Renamed category to "${newName.trim()}"`)
    await saveWorkbook(wb)
  })
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<void> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    const sheet = wb.getWorksheet('Categories')
    if (!sheet) throw new Error('Categories sheet missing')

    let found = false
    let catName = ''
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      if (cellValueToString(row.getCell(1).value) === id) {
        row.getCell(4).value = isActive ? 'TRUE' : 'FALSE'
        catName = cellValueToString(row.getCell(2).value)
        found = true
      }
    })
    if (!found) throw new Error('Category not found')

    addAuditEntry(
      wb,
      'UPDATE',
      'categories',
      `${isActive ? 'Reactivated' : 'Deactivated'} category "${catName}"`
    )
    await saveWorkbook(wb)
  })
}

export async function deleteCategory(id: string): Promise<void> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    const catSheet = wb.getWorksheet('Categories')
    const txSheet = wb.getWorksheet('Transactions')
    if (!catSheet) throw new Error('Categories sheet missing')

    let usageCount = 0
    if (txSheet) {
      txSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        if (cellValueToString(row.getCell(5).value) === id) {
          usageCount++
        }
      })
    }
    if (usageCount > 0) {
      throw new Error(`Cannot delete: Category is used in ${usageCount} transaction(s). You can deactivate it instead.`)
    }

    let rowIndexToDelete = -1
    let catName = ''
    catSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      if (cellValueToString(row.getCell(1).value) === id) {
        rowIndexToDelete = rowNumber
        catName = cellValueToString(row.getCell(2).value)
      }
    })

    if (rowIndexToDelete === -1) throw new Error('Category not found')
    catSheet.spliceRows(rowIndexToDelete, 1)

    addAuditEntry(wb, 'DELETE', 'categories', `Deleted category "${catName}"`)
    await saveWorkbook(wb)
  })
}

export async function createTransaction(input: {
  type: TxType
  transaction_date: string
  amount: string
  category_id: string
  payment_method: string
  person_name?: string | null
  description?: string | null
  reference_number?: string | null
}): Promise<Transaction> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    const catSheet = wb.getWorksheet('Categories')
    const txSheet = wb.getWorksheet('Transactions')
    if (!txSheet) throw new Error('Transactions sheet missing')

    let categoryName = 'Uncategorized'
    if (catSheet) {
      catSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        if (cellValueToString(row.getCell(1).value) === input.category_id) {
          categoryName = cellValueToString(row.getCell(2).value)
        }
      })
    }

    const id = generateId()
    const amountNum = Number(input.amount)
    const amountPaise = toPaise(input.amount)

    txSheet.addRow([
      id,
      input.transaction_date,
      input.type,
      amountNum,
      input.category_id,
      categoryName,
      input.person_name || '',
      input.payment_method,
      input.reference_number || '',
      input.description || '',
      new Date().toISOString(),
    ])

    addAuditEntry(
      wb,
      'INSERT',
      'transactions',
      `Recorded ${input.type} of ₹${input.amount} for ${categoryName}`
    )
    await saveWorkbook(wb)

    return {
      id,
      transaction_date: input.transaction_date,
      type: input.type,
      amountPaise,
      category_id: input.category_id,
      category_name: categoryName,
      person_name: input.person_name || null,
      payment_method: input.payment_method,
      reference_number: input.reference_number || null,
      description: input.description || null,
    }
  })
}

export async function updateTransaction(
  id: string,
  input: {
    type: TxType
    transaction_date: string
    amount: string
    category_id: string
    payment_method: string
    person_name?: string | null
    description?: string | null
    reference_number?: string | null
  }
): Promise<Transaction> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    const catSheet = wb.getWorksheet('Categories')
    const txSheet = wb.getWorksheet('Transactions')
    if (!txSheet) throw new Error('Transactions sheet missing')

    let categoryName = 'Uncategorized'
    if (catSheet) {
      catSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        if (cellValueToString(row.getCell(1).value) === input.category_id) {
          categoryName = cellValueToString(row.getCell(2).value)
        }
      })
    }

    let foundRow: ExcelJS.Row | null = null
    txSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      if (cellValueToString(row.getCell(1).value) === id) {
        foundRow = row
      }
    })

    if (!foundRow) throw new Error('Transaction not found')

    const amountNum = Number(input.amount)
    const amountPaise = toPaise(input.amount)

    const row = foundRow as ExcelJS.Row
    row.getCell(2).value = input.transaction_date
    row.getCell(3).value = input.type
    row.getCell(4).value = amountNum
    row.getCell(5).value = input.category_id
    row.getCell(6).value = categoryName
    row.getCell(7).value = input.person_name || ''
    row.getCell(8).value = input.payment_method
    row.getCell(9).value = input.reference_number || ''
    row.getCell(10).value = input.description || ''

    addAuditEntry(
      wb,
      'UPDATE',
      'transactions',
      `Updated ${input.type} of ₹${input.amount} (${categoryName})`
    )
    await saveWorkbook(wb)

    return {
      id,
      transaction_date: input.transaction_date,
      type: input.type,
      amountPaise,
      category_id: input.category_id,
      category_name: categoryName,
      person_name: input.person_name || null,
      payment_method: input.payment_method,
      reference_number: input.reference_number || null,
      description: input.description || null,
    }
  })
}

export async function deleteTransaction(id: string): Promise<void> {
  return mutate(async () => {
    const wb = await loadWorkbook()
    const txSheet = wb.getWorksheet('Transactions')
    if (!txSheet) throw new Error('Transactions sheet missing')

    let rowIndex = -1
    let summaryText = ''
    txSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      if (cellValueToString(row.getCell(1).value) === id) {
        rowIndex = rowNumber
        summaryText = `${cellValueToString(row.getCell(3).value)} of ₹${cellValueToString(row.getCell(4).value)} on ${cellValueToString(row.getCell(2).value)}`
      }
    })

    if (rowIndex === -1) throw new Error('Transaction not found')
    txSheet.spliceRows(rowIndex, 1)

    addAuditEntry(wb, 'DELETE', 'transactions', `Deleted transaction: ${summaryText}`)
    await saveWorkbook(wb)
  })
}

export async function importLedgerFromBuffer(buffer: Buffer): Promise<{
  success: boolean
  message: string
  transactionsCount: number
}> {
  return mutate(async () => {
    const incomingWb = new ExcelJS.Workbook()
    await incomingWb.xlsx.load(buffer as any)

    const incomingTx = incomingWb.getWorksheet('Transactions') || incomingWb.worksheets[0]
    if (!incomingTx) {
      throw new Error('Invalid Excel file: No sheets found.')
    }

    await incomingWb.xlsx.writeFile(LEDGER_PATH)

    let txCount = 0
    incomingTx.eachRow((_, rowNumber) => {
      if (rowNumber > 1) txCount++
    })

    return {
      success: true,
      message: `Successfully loaded Excel ledger with ${txCount} transaction records`,
      transactionsCount: txCount,
    }
  })
}
