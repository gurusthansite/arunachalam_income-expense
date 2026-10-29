import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, Plus, FileBarChart } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { TransactionsTable } from '@/components/transactions/transactions-table'
import { getCategories, getTransactions } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { TxType } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Transactions',
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    categoryId?: string
    sort?: string
    dir?: string
    page?: string
    from?: string
    to?: string
    range?: string
  }>
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page || '1') || 1)
  const pageSize = 20

  const validTypes: TxType[] = ['income', 'expense']
  const type = validTypes.includes(params.type as TxType) ? (params.type as TxType) : undefined
  const sort = params.sort === 'amount' ? 'amount' : 'date'
  const dir = params.dir === 'asc' ? 'asc' : 'desc'

  const [categories, { rows: transactions, total }] = await Promise.all([
    getCategories(),
    getTransactions({
      q: params.q,
      type,
      categoryId: params.categoryId,
      from: params.from,
      to: params.to,
      sort,
      dir,
      page,
      pageSize,
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Transactions"
          description="View, search, edit and manage all organization income and expenses"
        />
        <div className="flex items-center gap-2 self-start">
          <Link
            href="/reports"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-9 gap-1.5 text-xs')}
          >
            <FileBarChart className="size-3.5" />
            <span>Reports</span>
          </Link>
          <Link
            href="/income/new"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'h-9 gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs'
            )}
          >
            <ArrowDownLeft className="size-3.5" />
            <span>Add Income</span>
          </Link>
          <Link
            href="/expense/new"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'h-9 gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs'
            )}
          >
            <ArrowUpRight className="size-3.5" />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

      <TransactionsTable
        transactions={transactions}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        categories={categories}
        currentFilters={{
          q: params.q ?? '',
          type: type ?? '',
          categoryId: params.categoryId ?? '',
          sort,
          dir,
          from: params.from,
          to: params.to,
          range: params.range,
        }}
      />
    </div>
  )
}
