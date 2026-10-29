'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Save, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form-field'
import { updateSettings } from '@/app/actions/settings'
import { MONTH_NAMES } from '@/lib/dates'
import { paiseToDecimalString } from '@/lib/money'
import type { OrgSettings } from '@/lib/types'

interface OrgDetailsFormProps {
  settings: OrgSettings
  isAdmin: boolean
}

export function OrgDetailsForm({ settings, isAdmin }: OrgDetailsFormProps) {
  const router = useRouter()
  const [orgName, setOrgName] = useState(settings.organization_name)
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? '')
  const [openingBalance, setOpeningBalance] = useState(
    paiseToDecimalString(settings.openingBalancePaise)
  )
  const [openingDate, setOpeningDate] = useState(settings.opening_balance_date)
  const [fyStartMonth, setFyStartMonth] = useState(String(settings.financial_year_start_month))

  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) {
      toast.error('Only organization administrators can update settings.')
      return
    }

    setSaving(true)
    setFieldErrors({})
    setGeneralError(null)

    try {
      const res = await updateSettings({
        organization_name: orgName,
        logo_url: logoUrl,
        opening_balance: openingBalance,
        opening_balance_date: openingDate,
        financial_year_start_month: fyStartMonth,
      })

      if (!res.ok) {
        setGeneralError(res.error)
        if (res.fieldErrors) setFieldErrors(res.fieldErrors)
        toast.error(res.error)
      } else {
        toast.success(res.message || 'Settings saved successfully')
        router.refresh()
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to update settings.')
      toast.error('Failed to update settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {generalError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Organization Name */}
        <FormField
          id="organization_name"
          label="Organization Name"
          required
          error={fieldErrors.organization_name}
        >
          <Input
            id="organization_name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            disabled={!isAdmin || saving}
            maxLength={120}
            className="h-10"
            required
          />
        </FormField>

        {/* Logo URL */}
        <FormField
          id="logo_url"
          label="Logo URL (Optional)"
          error={fieldErrors.logo_url}
          hint="Direct image link (https://...)"
        >
          <Input
            id="logo_url"
            type="url"
            placeholder="https://example.org/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={!isAdmin || saving}
            maxLength={500}
            className="h-10"
          />
        </FormField>

        {/* Opening Balance */}
        <FormField
          id="opening_balance"
          label="Opening Balance (INR ₹)"
          required
          error={fieldErrors.opening_balance}
          hint="Balance in account at organization start date"
        >
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">₹</span>
            <Input
              id="opening_balance"
              type="text"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              disabled={!isAdmin || saving}
              className="h-10 pl-8 font-mono"
              required
            />
          </div>
        </FormField>

        {/* Opening Balance Date */}
        <FormField
          id="opening_balance_date"
          label="Opening Balance Date"
          required
          error={fieldErrors.opening_balance_date}
          hint="Date from which records begin"
        >
          <Input
            id="opening_balance_date"
            type="date"
            value={openingDate}
            onChange={(e) => setOpeningDate(e.target.value)}
            disabled={!isAdmin || saving}
            className="h-10"
            required
          />
        </FormField>

        {/* Financial Year Start Month */}
        <FormField
          id="financial_year_start_month"
          label="Financial Year Start Month"
          required
          error={fieldErrors.financial_year_start_month}
          hint="In India, typically April (Month 4)"
        >
          <select
            id="financial_year_start_month"
            value={fyStartMonth}
            onChange={(e) => setFyStartMonth(e.target.value)}
            disabled={!isAdmin || saving}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={String(idx + 1)}>
                {name} (Month {idx + 1})
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {isAdmin && (
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={saving} className="h-10 gap-2">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Save className="size-4" />
                <span>Save Organization Details</span>
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}
