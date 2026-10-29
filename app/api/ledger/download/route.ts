import { NextResponse } from 'next/server'
import fs from 'node:fs'
import { ensureLedgerFile, getLedgerFilePath, getSettings } from '@/lib/excel-storage'

export async function GET() {
  await ensureLedgerFile()
  const filePath = getLedgerFilePath()
  const settings = await getSettings()
  const fileBuffer = fs.readFileSync(filePath)

  const filename = `${settings.organization_name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Ledger.xlsx`

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
