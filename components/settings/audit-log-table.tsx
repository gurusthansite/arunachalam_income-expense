import { ShieldCheck, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AuditEntry } from '@/lib/data'

interface AuditLogTableProps {
  entries: AuditEntry[]
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground border rounded-lg">
        <History className="size-6 mb-2 text-muted-foreground/60" />
        <p>No audit trail records yet.</p>
        <p className="text-[11px] mt-0.5">Changes, modifications and deletions will automatically be audited here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Timestamp</TableHead>
              <TableHead className="w-[90px]">Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Summary of Event</TableHead>
              <TableHead className="w-[180px]">User Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-mono ${
                      entry.action === 'DELETE'
                        ? 'border-destructive text-destructive'
                        : entry.action === 'INSERT'
                          ? 'border-emerald-600 text-emerald-700'
                          : 'border-blue-600 text-blue-700'
                    }`}
                  >
                    {entry.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {entry.table_name}
                </TableCell>
                <TableCell className="text-xs font-medium">
                  {entry.summary}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {entry.user_email || 'System / Direct'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
