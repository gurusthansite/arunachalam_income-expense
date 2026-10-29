import { FileSpreadsheet, ExternalLink, Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function UserFooter({ email, role }: { email: string; role: string }) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Google Sheets Live</span>
          </p>
          <p className="text-[10px] text-muted-foreground truncate">Synced via Apps Script</p>
        </div>
        <a
          href="/api/ledger/download"
          download
          title="Download raw Excel backup"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 text-[11px] px-2 gap-1 shrink-0')}
        >
          <Download className="size-3" />
          <span>XLSX</span>
        </a>
      </div>
    </div>
  )
}
