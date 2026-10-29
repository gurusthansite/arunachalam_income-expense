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
const CACHE_TTL_MS = 60000 // 60-second cache: makes page transitions instant (0ms) instead of waiting 4 seconds every time

export function invalidateGoogleSheetsCache() {
  memoryCache = null
}

async function fetchFromGoogleSheets(): Promise<any> {
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
    memoryCache = { data, timestamp: Date.now() }
    return data
  } catch (err: any) {
    console.error('Error fetching Google Sheets data:', err.message)
    return memoryCache ? memoryCache.data : null
  }
}

async function fetchRawGoogleSheetsData() {
  const now = Date.now()
  // 1. If we have fresh cached data (< 60s), return it immediately (0ms latency)
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data
  }

  // 2. If we have stale cache, return it immediately and refresh in background (Stale-While-Revalidate)
  if (memoryCache) {
    fetchFromGoogleSheets().catch(() => {})
    return memoryCache.data
  }

  // 3. Otherwise fetch fresh data
  return await fetchFromGoogleSheets()
}

export const fetchGoogleSheetsData = cache(fetchRawGoogleSheetsData)

export async function postGoogleSheetsAction(payload: any) {
  const now = Date.now()
  // Optimistic cache update for instant UI feedback
  if (memoryCache?.data) {
    const data = memoryCache.data
    if (payload.action === 'addTransaction') {
      const tempId = 'tx_' + now + '_' + Math.floor(Math.random() * 1000)
      const newTx = {
        id: tempId,
        transaction_date: payload.date,
        type: String(payload.type).toLowerCase(),
        amount: Number(payload.amount),
        category_name: payload.category || 'Uncategorized',
        person_name: payload.party || null,
        contact_number: payload.contactNumber || null,
        payment_method: payload.paymentMethod || 'Cash',
        reference_number: payload.referenceNumber || null,
        description: payload.description || null,
        created_at: new Date().toISOString(),
      }
      data.transactions = [newTx, ...(data.transactions || [])]
      memoryCache = { data, timestamp: now }
    } else if (payload.action === 'updateTransaction') {
      if (data.transactions) {
        data.transactions = data.transactions.map((t: any) => {
          if (String(t.id) === String(payload.id)) {
            return {
              ...t,
              transaction_date: payload.date || t.transaction_date,
              type: payload.type ? String(payload.type).toLowerCase() : t.type,
              amount: payload.amount !== undefined ? Number(payload.amount) : t.amount,
              paid: payload.paid !== undefined ? Number(payload.paid) : (payload.amount !== undefined ? Number(payload.amount) : t.paid),
              pending: payload.pending !== undefined ? Number(payload.pending) : t.pending,
              category_name: payload.category || t.category_name,
              person_name: payload.party !== undefined ? (payload.party || null) : t.person_name,
              contact_number: payload.contactNumber !== undefined ? (payload.contactNumber || null) : t.contact_number,
              payment_method: payload.paymentMethod || t.payment_method,
              reference_number: payload.referenceNumber !== undefined ? (payload.referenceNumber || null) : t.reference_number,
              description: payload.description !== undefined ? (payload.description || null) : t.description,
            }
          }
          return t
        })
      }
      memoryCache = { data, timestamp: now }
    } else if (payload.action === 'deleteTransaction') {
      if (data.transactions) {
        data.transactions = data.transactions.filter((t: any) => String(t.id) !== String(payload.id))
      }
      memoryCache = { data, timestamp: now }
    }
  }

  const url = getGoogleSheetsScriptUrl()
  if (!url) return null

  // Ensure phone numbers starting with + or 0 are treated as text by Google Sheets
  if (payload.contactNumber && typeof payload.contactNumber === 'string') {
    const trimmed = payload.contactNumber.trim()
    if ((trimmed.startsWith('+') || trimmed.startsWith('0')) && !trimmed.startsWith("'")) {
      payload.contactNumber = `'${trimmed}`
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    // Revalidate cache in background after successful Google Sheets persistence
    setTimeout(() => {
      fetchFromGoogleSheets().catch(() => {})
    }, 1000)
    return result
  } catch (err: any) {
    console.error('Error posting to Google Sheets:', err.message)
    return null
  }
}
