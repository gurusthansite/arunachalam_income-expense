import { NextRequest, NextResponse } from 'next/server'
import { importLedgerFromBuffer } from '@/lib/excel-storage'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid file format. Please upload an Excel (.xlsx) file.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await importLedgerFromBuffer(buffer)

    return NextResponse.json({ ok: true, message: result.message, count: result.transactionsCount })
  } catch (err: any) {
    console.error('Error importing Excel file:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to import Excel file.' },
      { status: 500 }
    )
  }
}
