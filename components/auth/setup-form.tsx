'use client'

import { useState, useTransition } from 'react'
import { setupFirstAdmin } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form-field'

export function SetupForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await setupFirstAdmin({
        organization_name: String(form.get('organization_name') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      })
      if (result && !result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField id="organization_name" label="Organization name" error={fieldErrors.organization_name}>
        <Input id="organization_name" name="organization_name" required maxLength={120} className="h-10" />
      </FormField>
      <FormField id="email" label="Admin email" error={fieldErrors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" />
      </FormField>
      <FormField
        id="password"
        label="Password"
        error={fieldErrors.password}
        hint="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-10"
        />
      </FormField>
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? 'Creating account…' : 'Create admin account'}
      </Button>
    </form>
  )
}
