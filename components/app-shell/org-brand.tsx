import { Landmark } from 'lucide-react'

export function OrgBrand({ orgName, logoUrl }: { orgName: string; logoUrl: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="size-9 shrink-0 rounded-lg border object-cover"
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Landmark className="size-4" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{orgName}</p>
        <p className="text-xs text-muted-foreground">Income & Expenses</p>
      </div>
    </div>
  )
}
