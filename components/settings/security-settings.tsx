'use client'

import { useState } from 'react'
import { ShieldCheck, KeyRound, Lock, Users, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function SecuritySettings() {
  const [copied, setCopied] = useState(false)

  function copyEnvSample() {
    navigator.clipboard.writeText('SITE_PASSWORD=your_secure_password_here')
    setCopied(true)
    toast.success('Copied environment sample to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="flex items-start gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck className="size-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Site Password Protection is Active</h3>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]">
              Enabled
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            All financial entries, dashboards, transactions, reports, and API routes are strictly protected. Anyone visiting this site must provide an authorized password to enter.
          </p>
        </div>
      </div>

      {/* Configuration Guide */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Single Master Password */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            <KeyRound className="size-4 text-primary" />
            <span>Set Custom Site Password</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            To set your own secret password, add <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SITE_PASSWORD</code> to your environment file (<code className="font-mono text-xs">.env.local</code> or Vercel Environment Variables).
          </p>
          <div className="flex items-center justify-between rounded-lg bg-muted/60 p-2.5 font-mono text-xs border">
            <span className="truncate">SITE_PASSWORD=your_password</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copyEnvSample}
              className="h-6 px-2 text-[11px] gap-1 shrink-0"
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        {/* Multiple Passwords for Team Members */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            <Users className="size-4 text-primary" />
            <span>Multiple Passwords for Specific People</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you want different authorized individuals to each have their own password, you can supply a comma-separated list:
          </p>
          <div className="rounded-lg bg-muted/60 p-2.5 font-mono text-xs border truncate">
            SITE_PASSWORDS=pass1, pass2, pass3
          </div>
          <p className="text-[11px] text-muted-foreground">
            Entering any of the listed passwords will grant access to the ledger.
          </p>
        </div>
      </div>

      {/* Session Security */}
      <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-xs">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Lock className="size-3.5 text-muted-foreground" />
          <span>Session & Device Security</span>
        </h4>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px]">
          <li>Sessions are signed cryptographically with SHA-256 and stored in secure, HTTP-only cookies.</li>
          <li>Users can lock the application at any time by clicking the <strong>Lock icon</strong> in the sidebar footer or navigation drawer.</li>
          <li>Default password when not configured in environment: <code className="rounded bg-muted px-1.5 py-0.2 font-mono text-foreground font-semibold">admin123</code>.</li>
        </ul>
      </div>
    </div>
  )
}
