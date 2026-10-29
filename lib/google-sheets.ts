import 'server-only'

const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxVNp05J2CRBox0DZ_FlIrl0yyDO5nBiCa0ty9yHswJz-QprZmLR7INrD1H0c_-nvbF/exec'

export function getGoogleSheetsScriptUrl(): string {
  return (
    process.env.GOOGLE_SHEETS_APP_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    DEFAULT_SCRIPT_URL
  )
}

export async function fetchGoogleSheetsData() {
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
    return data
  } catch (err: any) {
    console.error('Error fetching Google Sheets data:', err.message)
    return null
  }
}

export async function postGoogleSheetsAction(payload: any) {
  const url = getGoogleSheetsScriptUrl()
  if (!url) return null

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err: any) {
    console.error('Error posting to Google Sheets:', err.message)
    return null
  }
}
