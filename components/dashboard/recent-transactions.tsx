import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Phone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/dates'
import { formatINR } from '@/lib/money'
import { cn } from '@/lib/utils'
import { paymentMethodLabel, getTxPaidPaise, getTxPendingPaise, type Transaction } from '@/lib/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="rounded-xl shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">Latest ledger activity with real-time settlement status</CardDescription>
        </div>
        <Link
          href="/transactions"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1 text-xs font-semibold')}
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {transactions.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center text-muted-foreground border-t">
            <p className="text-sm font-medium">No recent transactions recorded</p>
            <p className="text-xs mt-1">Start by adding your first income or expense</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[110px] text-xs font-semibold">Date</TableHead>
                  <TableHead className="w-[95px] text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Party / Vendor</TableHead>
                  <TableHead className="text-xs font-semibold">Method</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Amount & Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'income'
                  const paid = getTxPaidPaise(tx)
                  const pending = getTxPendingPaise(tx)
                  const isFullyPaid = pending <= 0
                  const isUnpaid = !isIncome && paid <= 0
                  const isPartial = !isIncome && paid > 0 && pending > 0

                  return (
                    <TableRow
                      key={tx.id}
                      className={cn(
                        'transition-colors',
                        isIncome && 'border-l-[3.5px] border-l-emerald-500 hover:bg-emerald-500/[0.04]',
                        isFullyPaid && !isIncome && 'border-l-[3.5px] border-l-slate-300 hover:bg-muted/40 dark:border-l-slate-700',
                        isPartial && 'border-l-[3.5px] border-l-amber-500 bg-amber-500/[0.025] hover:bg-amber-500/[0.06]',
                        isUnpaid && 'border-l-[3.5px] border-l-rose-500 bg-rose-500/[0.035] hover:bg-rose-500/[0.07]'
                      )}
                    >
                      <TableCell className="font-semibold text-xs whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-medium px-2 py-0.5',
                            isIncome
                              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          )}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="mr-1 size-3 shrink-0" />
                          ) : (
                            <ArrowUpRight className="mr-1 size-3 shrink-0" />
                          )}
                          {isIncome ? 'Income' : 'Expense'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{tx.category_name}</TableCell>
                      <TableCell className="text-xs">
                        <span className="text-foreground font-semibold block">{tx.person_name || '—'}</span>
                        {tx.contact_number && (
                          <span className="text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                            <Phone className="size-2.5" /> {tx.contact_number}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {paymentMethodLabel(tx.payment_method)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div
                          className={`font-mono text-xs font-bold ${
                            isIncome
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {isIncome ? `+₹${formatINR(Math.abs(tx.amountPaise))}` : `₹${formatINR(Math.abs(tx.amountPaise))}`}
                        </div>
                        {!isIncome && (
                          <div className="mt-0.5">
                            {isFullyPaid ? (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                ✓ Fully Paid
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                ₹{formatINR(pending)} Due
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded bg-rose-500/15 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:text-rose-300">
                                ⚠️ ₹{formatINR(pending)} Unpaid
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
