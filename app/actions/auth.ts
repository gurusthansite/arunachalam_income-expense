'use server'

import { redirect } from 'next/navigation'
import type { ActionResult } from '@/lib/types'

export async function signIn(input?: any): Promise<ActionResult> {
  redirect('/')
}

export async function signOut() {
  redirect('/')
}

export async function setupFirstAdmin(input?: any): Promise<ActionResult> {
  redirect('/')
}

export async function addMember(input?: any): Promise<ActionResult> {
  return { ok: false, error: 'User invitations are not needed in Excel storage mode.' }
}

export async function removeMember(userId?: string): Promise<ActionResult> {
  return { ok: false, error: 'User accounts are managed locally in Excel mode.' }
}
