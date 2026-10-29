'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NavLinks } from './nav-links'
import { OrgBrand } from './org-brand'

type Props = { orgName: string; logoUrl: string | null; email: string; role: string }

export function MobileHeader({ orgName, logoUrl, email, role }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur md:hidden">
      <OrgBrand orgName={orgName} logoUrl={logoUrl} />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}>
          <Menu className="size-4" aria-hidden="true" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-6 p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="pt-1">
            <OrgBrand orgName={orgName} logoUrl={logoUrl} />
          </div>
          <div className="flex-1">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t pt-4">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="text-xs capitalize text-muted-foreground">{role}</p>
            <form action="/auth/signout" method="post" className="mt-3">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
