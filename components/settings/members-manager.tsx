'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus, Shield, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/form-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { addMember, removeMember } from '@/app/actions/auth'
import { formatDate } from '@/lib/dates'
import type { Member } from '@/lib/types'

interface MembersManagerProps {
  members: Member[]
  currentUserId: string
  isAdmin: boolean
}

export function MembersManager({ members, currentUserId, isAdmin }: MembersManagerProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFieldErrors({})

    try {
      const res = await addMember({ email, password, role })
      if (!res.ok) {
        toast.error(res.error)
        if (res.fieldErrors) setFieldErrors(res.fieldErrors)
      } else {
        toast.success(res.message || 'Member added')
        setAddOpen(false)
        setEmail('')
        setPassword('')
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Failed to add member.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(member: Member) {
    if (!confirm(`Are you sure you want to revoke access for ${member.email}?`)) return
    try {
      const res = await removeMember(member.user_id)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(res.message || 'Member access revoked')
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Failed to remove member.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-sm font-semibold">Authorized Personnel</h3>
          <p className="text-xs text-muted-foreground">
            Only users in this list have access to this ledger. Public signup is disabled.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="h-9 gap-1.5 text-xs">
            <UserPlus className="size-4" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      <div className="divide-y rounded-lg border bg-card">
        {members.map((m) => {
          const isMe = m.user_id === currentUserId
          return (
            <div key={m.user_id} className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {m.role === 'admin' ? <Shield className="size-4" /> : <User className="size-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.email}</span>
                    {isMe && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary text-primary">
                        You
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Added {formatDate(m.created_at.slice(0, 10))}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                  {m.role}
                </Badge>
                {isAdmin && !isMe && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(m)}
                    title="Revoke access"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Remove</span>
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdd} noValidate>
            <DialogHeader>
              <DialogTitle>Invite Organization Member</DialogTitle>
              <DialogDescription className="text-xs">
                Create login credentials for a staff member or accountant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <FormField id="member_email" label="Email Address" required error={fieldErrors.email}>
                <Input
                  id="member_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.org"
                  required
                  className="h-10"
                />
              </FormField>

              <FormField
                id="member_password"
                label="Initial Password"
                required
                error={fieldErrors.password}
                hint="At least 8 characters"
              >
                <Input
                  id="member_password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="h-10"
                />
              </FormField>

              <FormField id="member_role" label="Role" required>
                <select
                  id="member_role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                  className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  <option value="member">Member (Can record & view financial records)</option>
                  <option value="admin">Admin (Full settings, categories & user management)</option>
                </select>
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
