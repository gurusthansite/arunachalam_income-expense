import { getSettings } from '@/lib/data'
import { AppSidebar } from '@/components/app-shell/app-sidebar'
import { MobileHeader } from '@/components/app-shell/mobile-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()

  return (
    <div className="flex min-h-dvh">
      <AppSidebar
        orgName={settings.organization_name}
        logoUrl={settings.logo_url}
        email="Organization Ledger"
        role="Excel Database Mode"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          orgName={settings.organization_name}
          logoUrl={settings.logo_url}
          email="Organization Ledger"
          role="Excel Database Mode"
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
