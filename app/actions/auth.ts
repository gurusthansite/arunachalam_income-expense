'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AUTH_COOKIE_NAME, hashPassword, verifyPassword } from '@/lib/site-auth'
import type { ActionResult } from '@/lib/types'

export async function signInWithPassword(formData: FormData): Promise<ActionResult> {
  const password = formData.get('password') as string
  const rememberMe = formData.get('rememberMe') === 'on' || formData.get('rememberMe') === 'true'
  const returnTo = (formData.get('redirect') as string) || '/'

  if (!password || !password.trim()) {
    return { ok: false, error: 'Password is required' }
  }

  const isValid = await verifyPassword(password.trim())
  if (!isValid) {
    return { ok: false, error: 'Incorrect password. Access denied.' }
  }

  const token = await hashPassword(password.trim())
  const cookieStore = await cookies()

  // 30 days if remember me is checked, otherwise 24 hours
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  redirect(returnTo.startsWith('/') ? returnTo : '/')
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
  redirect('/login')
}

// Backward compatibility stubs
export async function signIn(input?: any): Promise<ActionResult> {
  redirect('/')
}

export async function setupFirstAdmin(input?: any): Promise<ActionResult> {
  redirect('/')
}

export async function addMember(input?: any): Promise<ActionResult> {
  return { ok: false, error: 'User invitations are not needed in Site Password mode.' }
}

export async function removeMember(userId?: string): Promise<ActionResult> {
  return { ok: false, error: 'User accounts are managed via Site Password.' }
}
