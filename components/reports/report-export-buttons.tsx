'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, TableProperties, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/reports/export'
import type { CategoryTotal, FinancialSummary, PersonTotal, Transaction } from '@/lib/types'

interface ReportExportButtonsProps {
  orgName: string
  dateRangeLabel: string
  summary: FinancialSummary
  transactions: Transaction[]
  expenseCategories: CategoryTotal[]
  incomeCategories: CategoryTotal[]
  incomeSources: PersonTotal[]
}

export function ReportExportButtons(props: ReportExportButtonsProps) {
  const [exporting, setExporting] = useState<string | null>(null)

  async function handleExport(type: 'csv' | 'excel' | 'pdf') {
    setExporting(type)
    try {
      if (type === 'csv') {
        exportToCSV(props)
        toast.success('CSV report downloaded')
      } else if (type === 'excel') {
        await exportToExcel(props)
        toast.success('Excel workbook downloaded')
      } else if (type === 'pdf') {
        exportToPDF(props)
        toast.success('PDF statement downloaded')
      }
    } catch (err: any) {
      console.error('Export failed:', err)
      toast.error('Failed to generate export file.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={Boolean(exporting)}
        onClick={() => handleExport('csv')}
        className="h-9 gap-1.5 text-xs"
      >
        {exporting === 'csv' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <TableProperties className="size-3.5 text-emerald-600" />
        )}
        <span>Export CSV</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={Boolean(exporting)}
        onClick={() => handleExport('excel')}
        className="h-9 gap-1.5 text-xs"
      >
        {exporting === 'excel' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="size-3.5 text-emerald-700" />
        )}
        <span>Export Excel</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={Boolean(exporting)}
        onClick={() => handleExport('pdf')}
        className="h-9 gap-1.5 text-xs"
      >
        {exporting === 'pdf' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FileText className="size-3.5 text-rose-600" />
        )}
        <span>Export PDF</span>
      </Button>
    </div>
  )
}
