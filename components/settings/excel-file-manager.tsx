'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ExcelFileManagerProps {
  transactionCount: number
  categoryCount: number
}

export function ExcelFileManager({ transactionCount, categoryCount }: ExcelFileManagerProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error('Please choose an Excel file to upload.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/ledger/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Failed to import Excel file.')
      } else {
        toast.success(data.message || 'Excel ledger imported successfully!')
        setFile(null)
        // Reset file input
        const input = document.getElementById('excel_upload_input') as HTMLInputElement | null
        if (input) input.value = ''
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading Excel file.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Excel Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Excel Workbook on Disk</p>
              <p className="font-mono text-xs text-muted-foreground">data/ledger.xlsx</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Stored Transactions: <strong className="text-foreground">{transactionCount}</strong></span>
            <span>Categories: <strong className="text-foreground">{categoryCount}</strong></span>
          </div>
          <div className="mt-4">
            <a
              href="/api/ledger/download"
              download
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full gap-2 text-xs')}
            >
              <Download className="size-3.5 text-emerald-600" />
              <span>Download Current Excel Ledger (.xlsx)</span>
            </a>
          </div>
        </div>

        {/* Upload / Replace Excel file */}
        <div className="rounded-lg border bg-card p-5 shadow-2xs">
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="size-4 text-primary" />
              <p className="text-sm font-semibold">Upload & Replace from Excel</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Have an existing Excel spreadsheet? Upload it here to update your ledger.
            </p>

            <div className="space-y-2">
              <input
                id="excel_upload_input"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/80"
              />
              {file && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!file || uploading}
              className="w-full gap-1.5 text-xs"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Importing Spreadsheet…</span>
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  <span>Import Selected Excel File</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
