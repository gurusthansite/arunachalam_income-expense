export const AUTH_COOKIE_NAME = 'site_access_token'
const SALT = 'income_expense_vault_salt_2026'

/**
 * Computes deterministic SHA-256 hash using native Web Crypto
 * Completely portable across Node.js, Next.js Proxy, and Edge runtimes.
 */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${password.trim()}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Gets all allowed access passwords from environment configuration
 */
export function getAllowedPasswords(): string[] {
  const list: string[] = []

  // 1. Single primary password
  if (process.env.SITE_PASSWORD) {
    list.push(process.env.SITE_PASSWORD.trim())
  }
  if (process.env.APP_PASSWORD) {
    list.push(process.env.APP_PASSWORD.trim())
  }

  // 2. Comma-separated list of multiple authorized passwords
  // e.g. SITE_PASSWORDS="admin123, team2026, lohith@safe"
  if (process.env.SITE_PASSWORDS) {
    const split = process.env.SITE_PASSWORDS.split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    list.push(...split)
  }

  // 3. Fallback default password if no custom password was set yet in .env
  if (list.length === 0) {
    list.push('admin123')
  }

  return Array.from(new Set(list))
}

/**
 * Verifies if the provided password matches any authorized password
 */
export async function verifyPassword(inputPassword: string): Promise<boolean> {
  if (!inputPassword) return false
  const trimmed = inputPassword.trim()
  const allowed = getAllowedPasswords()

  for (const pwd of allowed) {
    if (trimmed === pwd) return true
  }
  return false
}

/**
 * Verifies if the cookie session token matches any authorized password hash
 */
export async function verifyAuthToken(token: string): Promise<boolean> {
  if (!token) return false
  const allowed = getAllowedPasswords()

  for (const pwd of allowed) {
    const validHash = await hashPassword(pwd)
    if (token === validHash) return true
  }
  return false
}
