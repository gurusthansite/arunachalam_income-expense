'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInWithPassword } from '@/app/actions/auth'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) {
      setError('Please enter the access password')
      return
    }

    setError(null)
    const formData = new FormData()
    formData.set('password', password.trim())
    formData.set('rememberMe', rememberMe ? 'on' : 'off')
    formData.set('redirect', redirectUrl)

    startTransition(async () => {
      try {
        const result = await signInWithPassword(formData)
        if (result && !result.ok) {
          setError(result.error || 'Incorrect password. Access denied.')
        }
      } catch (err: any) {
        // redirect() throws an internal NEXT_REDIRECT error in Server Actions
        if (err?.message?.includes('NEXT_REDIRECT') || err?.digest?.includes('NEXT_REDIRECT')) {
          return
        }
        setError(err.message || 'Authentication error. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-semibold">
          Access Password
        </Label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <KeyRound className="size-4" />
          </div>
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter security password…"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError(null)
            }}
            disabled={isPending}
            autoFocus
            required
            className="h-10 pl-9 pr-10 text-sm font-medium"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <label className="flex cursor-pointer items-center gap-2 select-none text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-3.5 rounded border-muted-foreground/30 text-primary accent-primary focus:ring-1 focus:ring-primary"
          />
          <span>Remember me for 30 days</span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-10 gap-2 font-semibold shadow-xs"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Verifying…</span>
          </>
        ) : (
          <>
            <Lock className="size-4" />
            <span>Unlock Ledger</span>
          </>
        )}
      </Button>

      <div className="pt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Authorized Personnel Only</span>
      </div>
    </form>
  )
}
