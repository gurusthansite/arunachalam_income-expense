import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from 'lucide-react'
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
import { paymentMethodLabel, type Transaction } from '@/lib/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">Latest activity recorded in the ledger</CardDescription>
        </div>
        <Link
          href="/transactions"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1 text-xs')}
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
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Party / Payee</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'income'
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium text-xs whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isIncome
                              ? 'border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : 'border-rose-500/20 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                          }
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
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.person_name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {paymentMethodLabel(tx.payment_method)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-semibold whitespace-nowrap ${
                          isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatINR(tx.amountPaise)}
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
