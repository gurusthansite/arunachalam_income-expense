import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PlusCircle,
  Clock,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { getSettings, getSummary, getPeriodTotals, getRecentTransactions } from '@/lib/data'
import { resolveRange, formatDate } from '@/lib/dates'
import { formatINR } from '@/lib/money'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Dashboard',
}

interface PageProps {
  searchParams: Promise<{
    range?: string
    from?: string
    to?: string
  }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const settings = await getSettings()
  const range = resolveRange(params, settings.financial_year_start_month, 'month')

  const [summary, periodTotals, recentTransactions] = await Promise.all([
    getSummary(range.from, range.to),
    getPeriodTotals(range.from, range.to, range.preset === 'month' ? 'day' : 'month'),
    getRecentTransactions(8),
  ])

  const isBalanceNegative = summary.closingPaise < 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Financial Dashboard"
          description={`Viewing summary for ${range.label}`}
        />
        <div className="flex flex-wrap items-center gap-2 sm:self-start">
          <DateRangeFilter
            currentPreset={range.preset}
            currentFrom={range.from}
            currentTo={range.to}
          />
          <div className="flex items-center gap-2">
            <Link
              href="/income/new"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'h-9 gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white'
              )}
            >
              <ArrowDownLeft className="size-4" />
              <span>Add Income</span>
            </Link>
            <Link
              href="/expense/new"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'h-9 gap-1.5 bg-rose-700 hover:bg-rose-800 text-white'
              )}
            >
              <ArrowUpRight className="size-4" />
              <span>Add Expense</span>
            </Link>
          </div>
        </div>
      </div>

      {isBalanceNegative && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <span className="font-semibold">Negative Balance Warning: </span>
            The organization's current balance is currently negative ({formatINR(summary.closingPaise)}). Total expenditures exceed available funds.
          </div>
        </div>
      )}

      {/* 4 Main Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Opening Balance"
          amount={formatINR(summary.periodOpeningPaise)}
          subtext={
            range.preset === 'all'
              ? `As of ${formatDate(settings.opening_balance_date)}`
              : range.from
                ? `Balance prior to ${formatDate(range.from)}`
                : `Initial opening balance`
          }
          icon={Clock}
          variant="default"
        />

        <StatCard
          title="Total Income"
          amount={
            summary.incomePaise > 0
              ? `+${formatINR(summary.incomePaise)}`
              : summary.incomePaise < 0
                ? `-${formatINR(Math.abs(summary.incomePaise))}`
                : formatINR(0)
          }
          subtext={`${summary.transactionCount} total records in period`}
          icon={TrendingUp}
          variant="income"
        />

        <StatCard
          title="Total Expenses"
          amount={
            summary.expensePaise > 0
              ? `-${formatINR(summary.expensePaise)}`
              : summary.expensePaise < 0
                ? `+${formatINR(Math.abs(summary.expensePaise))}`
                : formatINR(0)
          }
          subtext="Total organization outflow"
          icon={TrendingDown}
          variant="expense"
        />

        <StatCard
          title="Current Balance"
          amount={formatINR(summary.closingPaise)}
          subtext="Opening + Income − Expenses"
          icon={Wallet}
          variant="balance"
          isWarning={isBalanceNegative}
        />
      </div>

      {/* Financial Chart */}
      <div className="grid gap-6 lg:grid-cols-1">
        <IncomeExpenseChart
          data={periodTotals}
          title={
            range.preset === 'month'
              ? `Daily Inflow vs Outflow (${range.label})`
              : `Monthly Inflow vs Outflow (${range.label})`
          }
          description="Visual comparison of received income versus incurred expenditures"
        />
      </div>

      {/* Recent Transactions */}
      <div>
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  )
}
