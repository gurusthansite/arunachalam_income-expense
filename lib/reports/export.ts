import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatINRAscii, formatINRWhole, paiseToDecimalString, paiseToNumber, type Paise } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { paymentMethodLabel, type CategoryTotal, type FinancialSummary, type PersonTotal, type Transaction } from '@/lib/types'

interface ExportData {
  orgName: string
  dateRangeLabel: string
  summary: FinancialSummary
  transactions: Transaction[]
  expenseCategories: CategoryTotal[]
  incomeCategories: CategoryTotal[]
  incomeSources: PersonTotal[]
}

// 1. Export to CSV
export function exportToCSV({
  orgName,
  dateRangeLabel,
  summary,
  transactions,
}: ExportData) {
  const lines: string[] = []

  // Helper to escape CSV cell
  const escapeCell = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  // Header
  lines.push(`${escapeCell(orgName)} - Financial Statement`)
  lines.push(`Period: ${escapeCell(dateRangeLabel)}`)
  lines.push(`Generated: ${escapeCell(new Date().toLocaleString('en-IN'))}`)
  lines.push('')

  // Summary
  lines.push('SUMMARY')
  lines.push(`Opening Balance,${escapeCell(paiseToDecimalString(summary.periodOpeningPaise))}`)
  lines.push(`Total Income,${escapeCell(paiseToDecimalString(summary.incomePaise))}`)
  lines.push(`Total Expenses,${escapeCell(paiseToDecimalString(summary.expensePaise))}`)
  lines.push(`Closing Balance,${escapeCell(paiseToDecimalString(summary.closingPaise))}`)
  lines.push('')

  // Transactions Statement
  lines.push('TRANSACTION STATEMENT')
  lines.push([
    'Date',
    'Type',
    'Category',
    'Party / Person',
    'Payment Method',
    'Reference #',
    'Description',
    'Income (INR)',
    'Expense (INR)',
    'Running Balance (INR)',
  ].map(escapeCell).join(','))

  let runningBalance = summary.periodOpeningPaise
  transactions.forEach((tx) => {
    const isIncome = tx.type === 'income'
    if (isIncome) {
      runningBalance += tx.amountPaise
    } else {
      runningBalance -= tx.amountPaise
    }

    lines.push([
      formatDate(tx.transaction_date),
      isIncome ? 'Income' : 'Expense',
      tx.category_name,
      tx.person_name || '',
      paymentMethodLabel(tx.payment_method),
      tx.reference_number || '',
      tx.description || '',
      isIncome ? paiseToDecimalString(tx.amountPaise) : '',
      !isIncome ? paiseToDecimalString(tx.amountPaise) : '',
      paiseToDecimalString(runningBalance),
    ].map(escapeCell).join(','))
  })

  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${orgName.replace(/\s+/g, '_')}_Financial_Report.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 2. Export to Excel (XLSX)
export async function exportToExcel({
  orgName,
  dateRangeLabel,
  summary,
  transactions,
  expenseCategories,
  incomeCategories,
}: ExportData) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Ledger Organization Manager'
  workbook.created = new Date()

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Amount (INR)', key: 'amount', width: 22 },
  ]

  summarySheet.addRow({ metric: 'Organization', amount: orgName })
  summarySheet.addRow({ metric: 'Report Period', amount: dateRangeLabel })
  summarySheet.addRow({ metric: 'Export Date', amount: new Date().toLocaleDateString('en-IN') })
  summarySheet.addRow({})
  summarySheet.addRow({ metric: 'Opening Balance', amount: paiseToNumber(summary.periodOpeningPaise) })
  summarySheet.addRow({ metric: 'Total Income', amount: paiseToNumber(summary.incomePaise) })
  summarySheet.addRow({ metric: 'Total Expenses', amount: paiseToNumber(summary.expensePaise) })
  summarySheet.addRow({ metric: 'Closing Balance', amount: paiseToNumber(summary.closingPaise) })
  summarySheet.addRow({})

  // Category breakdown in summary sheet
  summarySheet.addRow({ metric: '--- EXPENSE CATEGORIES ---', amount: '' })
  expenseCategories.forEach((cat) => {
    summarySheet.addRow({ metric: cat.category_name, amount: paiseToNumber(cat.totalPaise) })
  })

  summarySheet.addRow({})
  summarySheet.addRow({ metric: '--- INCOME CATEGORIES ---', amount: '' })
  incomeCategories.forEach((cat) => {
    summarySheet.addRow({ metric: cat.category_name, amount: paiseToNumber(cat.totalPaise) })
  })

  // Sheet 2: Detailed Statement
  const statementSheet = workbook.addWorksheet('Transactions Statement')
  statementSheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Party / Person', key: 'person', width: 22 },
    { header: 'Method', key: 'method', width: 15 },
    { header: 'Reference #', key: 'ref', width: 18 },
    { header: 'Description', key: 'desc', width: 30 },
    { header: 'Income', key: 'income', width: 16 },
    { header: 'Expense', key: 'expense', width: 16 },
    { header: 'Balance', key: 'balance', width: 18 },
  ]

  let runningBalance = summary.periodOpeningPaise
  transactions.forEach((tx) => {
    const isIncome = tx.type === 'income'
    if (isIncome) runningBalance += tx.amountPaise
    else runningBalance -= tx.amountPaise

    statementSheet.addRow({
      date: tx.transaction_date,
      type: isIncome ? 'Income' : 'Expense',
      category: tx.category_name,
      person: tx.person_name || '',
      method: paymentMethodLabel(tx.payment_method),
      ref: tx.reference_number || '',
      desc: tx.description || '',
      income: isIncome ? paiseToNumber(tx.amountPaise) : null,
      expense: !isIncome ? paiseToNumber(tx.amountPaise) : null,
      balance: paiseToNumber(runningBalance),
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${orgName.replace(/\s+/g, '_')}_Financial_Statement.xlsx`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 3. Export to PDF (jsPDF + autoTable)
export function exportToPDF({
  orgName,
  dateRangeLabel,
  summary,
  transactions,
  expenseCategories,
}: ExportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  // Document Title Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(orgName, 40, 50)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Financial Income & Expense Statement`, 40, 68)
  doc.text(`Period: ${dateRangeLabel}`, 40, 84)
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 400, 84)

  // Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(40, 95, 555, 95)

  // Summary Box
  autoTable(doc, {
    startY: 105,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    head: [['Opening Balance', 'Total Income', 'Total Expenses', 'Closing Balance']],
    body: [[
      formatINRAscii(summary.periodOpeningPaise),
      formatINRAscii(summary.incomePaise),
      formatINRAscii(summary.expensePaise),
      formatINRAscii(summary.closingPaise),
    ]],
    headStyles: { fillColor: [40, 50, 60], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 10 },
  })

  // Category Summary Table
  const catRows = expenseCategories.slice(0, 8).map((c) => [
    c.category_name,
    c.count.toString(),
    formatINRAscii(c.totalPaise),
  ])

  if (catRows.length > 0) {
    const afterSummaryY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Expense Categories', 40, afterSummaryY)

    autoTable(doc, {
      startY: afterSummaryY + 6,
      margin: { left: 40, right: 40 },
      theme: 'striped',
      head: [['Category', 'Count', 'Total Amount']],
      body: catRows,
      headStyles: { fillColor: [240, 240, 245], textColor: [40, 40, 40], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { halign: 'right' },
      },
    })
  }

  // Transactions Table
  const txRows: any[] = []
  let runningBalance = summary.periodOpeningPaise
  transactions.slice(0, 500).forEach((tx) => {
    const isIncome = tx.type === 'income'
    if (isIncome) runningBalance += tx.amountPaise
    else runningBalance -= tx.amountPaise

    txRows.push([
      formatDate(tx.transaction_date),
      isIncome ? 'Income' : 'Expense',
      tx.category_name,
      tx.person_name || '—',
      isIncome ? formatINRAscii(tx.amountPaise) : '—',
      !isIncome ? formatINRAscii(tx.amountPaise) : '—',
      formatINRAscii(runningBalance),
    ])
  })

  const afterCatY = (doc as any).lastAutoTable.finalY + 20
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Transaction Details Statement', 40, afterCatY)

  autoTable(doc, {
    startY: afterCatY + 6,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    head: [['Date', 'Type', 'Category', 'Party / Payee', 'Income', 'Expense', 'Balance']],
    body: txRows,
    headStyles: { fillColor: [240, 240, 245], textColor: [40, 40, 40], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right', textColor: [16, 120, 60] },
      5: { halign: 'right', textColor: [180, 40, 40] },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Footer page number
      const str = 'Page ' + (doc as any).internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(str, 555 - 40, 820, { align: 'right' })
      doc.text('Confidential - For Organization Internal Use Only', 40, 820)
    },
  })

  doc.save(`${orgName.replace(/\s+/g, '_')}_Statement.pdf`)
}
