import { NavLinks } from './nav-links'
import { OrgBrand } from './org-brand'
import { UserFooter } from './user-footer'

type Props = { orgName: string; logoUrl: string | null; email: string; role: string }

export function AppSidebar({ orgName, logoUrl, email, role }: Props) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
      <div className="px-1 pt-1">
        <OrgBrand orgName={orgName} logoUrl={logoUrl} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <UserFooter email={email} role={role} />
    </aside>
  )
}
