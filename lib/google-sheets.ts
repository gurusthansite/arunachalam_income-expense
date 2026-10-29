import 'server-only'
import { cache } from 'react'

const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxVNp05J2CRBox0DZ_FlIrl0yyDO5nBiCa0ty9yHswJz-QprZmLR7INrD1H0c_-nvbF/exec'

export function getGoogleSheetsScriptUrl(): string {
  return (
    process.env.GOOGLE_SHEETS_APP_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    DEFAULT_SCRIPT_URL
  )
}

let memoryCache: { data: any; timestamp: number } | null = null
const CACHE_TTL_MS = 3000 // 3-second cache: batches simultaneous queries on the same page into 1 fast request

export function invalidateGoogleSheetsCache() {
  memoryCache = null
}

async function fetchRawGoogleSheetsData() {
  const now = Date.now()
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data
  }

  const url = getGoogleSheetsScriptUrl()
  if (!url) return null

  try {
    const res = await fetch(`${url}?action=getData`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || 'Failed to fetch from Google Sheets')
    memoryCache = { data, timestamp: now }
    return data
  } catch (err: any) {
    console.error('Error fetching Google Sheets data:', err.message)
    return memoryCache ? memoryCache.data : null
  }
}

export const fetchGoogleSheetsData = cache(fetchRawGoogleSheetsData)

export async function postGoogleSheetsAction(payload: any) {
  invalidateGoogleSheetsCache()
  const url = getGoogleSheetsScriptUrl()
  if (!url) return null

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    invalidateGoogleSheetsCache()
    return result
  } catch (err: any) {
    console.error('Error posting to Google Sheets:', err.message)
    return null
  }
}
