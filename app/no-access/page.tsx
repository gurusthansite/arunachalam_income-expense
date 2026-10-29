import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'No access' }

export default function NoAccessPage() {
  return (
    <AuthShell
      title="No access"
      description="Your account is not a member of this organization. Ask an admin to add you."
    >
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" className="h-10 w-full">
          Sign out
        </Button>
      </form>
    </AuthShell>
  )
}
