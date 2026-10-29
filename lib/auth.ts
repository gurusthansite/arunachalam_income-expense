import 'server-only'
import type { Member } from '@/lib/types'

const LOCAL_MEMBER: Member = {
  user_id: 'local_admin',
  email: 'organization@local.excel',
  role: 'admin',
  created_at: new Date().toISOString(),
}

export async function getCurrentMember(): Promise<Member | null> {
  return LOCAL_MEMBER
}

export async function requireMember(): Promise<Member> {
  return LOCAL_MEMBER
}

export async function getActionMember(): Promise<Member | null> {
  return LOCAL_MEMBER
}
