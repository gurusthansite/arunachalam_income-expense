import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Lock, Shield, Building2 } from 'lucide-react'
import { getSettings } from '@/lib/data'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Protected Access | Income & Expense Manager',
  description: 'Enter password to access organization ledger',
}

export default async function LoginPage() {
  const settings = await getSettings().catch(() => ({
    organization_name: 'Organization Ledger',
    logo_url: null,
  }))

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 sm:p-8">
      {/* Glow effect */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="size-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Brand / Organization Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          {settings.logo_url ? (
            <div className="relative size-14 overflow-hidden rounded-2xl border shadow-xs">
              <Image
                src={settings.logo_url}
                alt={settings.organization_name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-xs">
              <Building2 className="size-7" />
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {settings.organization_name}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Income & Expense Management System
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm backdrop-blur-xs sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Password Protected</h2>
              <p className="text-[11px] text-muted-foreground">
                Enter your security password to open this ledger
              </p>
            </div>
          </div>

          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-muted-foreground">
          <span>Protected Ledger • Financial Year 2026–27</span>
        </div>
      </div>
    </div>
  )
}
