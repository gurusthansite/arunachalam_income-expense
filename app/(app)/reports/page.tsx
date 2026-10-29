import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { ReportsView } from '@/components/reports/reports-view'
import {
  getCategoryTotals,
  getPaymentMethodTotals,
  getPeriodTotals,
  getPersonTotals,
  getSettings,
  getStatement,
  getSummary,
} from '@/lib/data'
import { resolveRange } from '@/lib/dates'

export const metadata: Metadata = {
  title: 'Reports & Statements',
}

interface PageProps {
  searchParams: Promise<{
    range?: string
    from?: string
    to?: string
  }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const settings = await getSettings()
  const range = resolveRange(params, settings.financial_year_start_month, 'fy')

  const [
    summary,
    periodTotals,
    expenseCategories,
    incomeCategories,
    incomeSources,
    expensePayees,
    statementResult,
    paymentMethodTotals,
  ] = await Promise.all([
    getSummary(range.from, range.to),
    getPeriodTotals(range.from, range.to, 'month'),
    getCategoryTotals(range.from, range.to, 'expense'),
    getCategoryTotals(range.from, range.to, 'income'),
    getPersonTotals(range.from, range.to, 'income'),
    getPersonTotals(range.from, range.to, 'expense'),
    getStatement(range.from, range.to),
    getPaymentMethodTotals(range.from, range.to),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Financial Reports & Statements"
          description={`Comprehensive financial statement and breakdowns for ${range.label}`}
        />
        <div className="self-start">
          <DateRangeFilter
            currentPreset={range.preset}
            currentFrom={range.from}
            currentTo={range.to}
          />
        </div>
      </div>

      <ReportsView
        orgName={settings.organization_name}
        dateRangeLabel={range.label}
        summary={summary}
        periodTotals={periodTotals}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        incomeSources={incomeSources}
        expensePayees={expensePayees}
        statementTransactions={statementResult.rows}
        paymentMethodTotals={paymentMethodTotals}
      />
    </div>
  )
}
