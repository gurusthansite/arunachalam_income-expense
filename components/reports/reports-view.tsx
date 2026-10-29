'use client'

import { useState } from 'react'
import {
  Calendar,
  BarChart3,
  PieChart,
  Users,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  HelpCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart'
import { ReportExportButtons } from '@/components/reports/report-export-buttons'
import { formatDate } from '@/lib/dates'
import { formatINR, paiseToDecimalString, type Paise } from '@/lib/money'
import {
  paymentMethodLabel,
  type CategoryTotal,
  type FinancialSummary,
  type PaymentMethodTotal,
  type PeriodTotal,
  type PersonTotal,
  type Transaction,
} from '@/lib/types'

interface ReportsViewProps {
  orgName: string
  dateRangeLabel: string
  summary: FinancialSummary
  periodTotals: PeriodTotal[]
  expenseCategories: CategoryTotal[]
  incomeCategories: CategoryTotal[]
  incomeSources: PersonTotal[]
  expensePayees: PersonTotal[]
  statementTransactions: Transaction[]
  paymentMethodTotals?: PaymentMethodTotal[]
}

export function ReportsView({
  orgName,
  dateRangeLabel,
  summary,
  periodTotals,
  expenseCategories,
  incomeCategories,
  incomeSources,
  expensePayees,
  statementTransactions,
  paymentMethodTotals = [],
}: ReportsViewProps) {
  const netChangePaise = summary.incomePaise - summary.expensePaise
  const isNetPositive = netChangePaise >= 0
  const isBalanceNegative = summary.closingPaise < 0

  // Calculate percentages for categories
  const totalExpensePaise = summary.expensePaise > 0 ? summary.expensePaise : 1
  const totalIncomePaise = summary.incomePaise > 0 ? summary.incomePaise : 1

  return (
    <div className="space-y-6">
      {/* Financial Position Summary Card */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/40 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Financial Position Statement</CardTitle>
              <CardDescription className="text-xs">
                Period: <span className="font-medium text-foreground">{dateRangeLabel}</span>
              </CardDescription>
            </div>
            <ReportExportButtons
              orgName={orgName}
              dateRangeLabel={dateRangeLabel}
              summary={summary}
              transactions={statementTransactions}
              expenseCategories={expenseCategories}
              incomeCategories={incomeCategories}
              incomeSources={incomeSources}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Opening Balance */}
            <div className="rounded-lg border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Period Opening Balance</span>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-foreground">
                {formatINR(summary.periodOpeningPaise)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Starting balance for selected date range
              </p>
            </div>

            {/* Total Income */}
            <div className="rounded-lg border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Total Income</span>
                <TrendingUp className="size-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                +{formatINR(summary.incomePaise)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Total inflow across {incomeCategories.length} categories
              </p>
            </div>

            {/* Total Expenses */}
            <div className="rounded-lg border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Total Expenses</span>
                <TrendingDown className="size-4 text-rose-600" />
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-rose-700 dark:text-rose-400">
                -{formatINR(summary.expensePaise)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Total expenditure across {expenseCategories.length} categories
              </p>
            </div>

            {/* Closing Balance */}
            <div
              className={`rounded-lg border p-4 shadow-2xs ${
                isBalanceNegative ? 'border-amber-400 bg-amber-500/5' : 'bg-card'
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Closing Balance</span>
                <Wallet className="size-4 text-primary" />
              </div>
              <p
                className={`mt-2 text-xl font-bold tracking-tight ${
                  isBalanceNegative ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
                }`}
              >
                {formatINR(summary.closingPaise)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Opening ({formatINR(summary.periodOpeningPaise)}) + Income − Expenses
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="size-3.5 shrink-0" />
              Net Period Result: Inflow exceeds outflow by{' '}
              <strong
                className={
                  isNetPositive
                    ? 'text-emerald-700 font-semibold'
                    : 'text-rose-700 font-semibold'
                }
              >
                {isNetPositive ? '+' : '-'}
                {formatINR(Math.abs(netChangePaise))}
              </strong>
            </span>
            <span>{summary.transactionCount} transactions analyzed</span>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="statement" className="space-y-4">
        <TabsList className="h-10 bg-muted p-1">
          <TabsTrigger value="statement" className="gap-1.5 text-xs">
            <FileText className="size-3.5" />
            <span>Detailed Statement</span>
          </TabsTrigger>
          <TabsTrigger value="methods" className="gap-1.5 text-xs">
            <CreditCard className="size-3.5" />
            <span>Payment Methods</span>
          </TabsTrigger>
          <TabsTrigger value="periods" className="gap-1.5 text-xs">
            <BarChart3 className="size-3.5" />
            <span>Periodic Totals</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 text-xs">
            <PieChart className="size-3.5" />
            <span>Category Breakdown</span>
          </TabsTrigger>
          <TabsTrigger value="parties" className="gap-1.5 text-xs">
            <Users className="size-3.5" />
            <span>Sources & Payees</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Detailed Statement */}
        <TabsContent value="statement" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chronological Ledger Statement</CardTitle>
              <CardDescription className="text-xs">
                Complete list of every payment and receipt in this period with running balance tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {statementTransactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground border-t">
                  No transactions recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead className="w-[80px]">Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Party / Payee</TableHead>
                        <TableHead className="w-[90px]">Method</TableHead>
                        <TableHead>Ref & Notes</TableHead>
                        <TableHead className="text-right">Income (₹)</TableHead>
                        <TableHead className="text-right">Expense (₹)</TableHead>
                        <TableHead className="text-right">Running Balance (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Initial opening balance row */}
                      <TableRow className="bg-muted/30 font-medium text-xs">
                        <TableCell colSpan={8} className="text-muted-foreground">
                          Opening Balance as of start of period
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatINR(summary.periodOpeningPaise)}
                        </TableCell>
                      </TableRow>

                      {(() => {
                        let runningBalance = summary.periodOpeningPaise
                        return statementTransactions.map((tx) => {
                          const isIncome = tx.type === 'income'
                          if (isIncome) runningBalance += tx.amountPaise
                          else runningBalance -= tx.amountPaise

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
                                      ? 'border-emerald-500/20 bg-emerald-50 text-emerald-700'
                                      : 'border-rose-500/20 bg-rose-50 text-rose-700'
                                  }
                                >
                                  {isIncome ? 'Income' : 'Expense'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {tx.category_name}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                <span className="text-foreground block">{tx.person_name || '—'}</span>
                                {tx.contact_number && (
                                  <span className="text-[11px] font-mono text-muted-foreground/80 block">
                                    📞 {tx.contact_number}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border">
                                  {paymentMethodLabel(tx.payment_method)}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                                {tx.reference_number ? (
                                  <span className="font-mono text-[11px] block text-foreground">
                                    Ref: {tx.reference_number}
                                  </span>
                                ) : null}
                                <span>{tx.description || '—'}</span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-emerald-700 font-medium">
                                {isIncome ? formatINR(tx.amountPaise) : '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-rose-700 font-medium">
                                {!isIncome ? formatINR(tx.amountPaise) : '—'}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono text-xs font-semibold ${
                                  runningBalance < 0 ? 'text-amber-600' : 'text-foreground'
                                }`}
                              >
                                {formatINR(runningBalance)}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Payment Methods Breakdown */}
        <TabsContent value="methods" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paymentMethodTotals.map((pm) => {
              const net = pm.incomePaise - pm.expensePaise
              const isPositive = net >= 0
              let Icon = Wallet
              if (pm.method === 'cash') Icon = Banknote
              else if (pm.method === 'upi') Icon = Smartphone
              else if (pm.method === 'bank_transfer') Icon = Building2
              else if (pm.method === 'card') Icon = CreditCard

              return (
                <Card key={pm.method} className="shadow-xs border">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{pm.label}</CardTitle>
                          <CardDescription className="text-xs">
                            {pm.count} total {pm.count === 1 ? 'transaction' : 'transactions'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        Net: {isPositive ? '+' : '-'}{formatINR(Math.abs(net))}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ArrowDownLeft className="size-3.5 text-emerald-600" /> Total Received:
                      </span>
                      <span className="font-mono font-medium text-emerald-700">
                        {formatINR(pm.incomePaise)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ArrowUpRight className="size-3.5 text-rose-600" /> Total Spent:
                      </span>
                      <span className="font-mono font-medium text-rose-700">
                        {formatINR(pm.expensePaise)}
                      </span>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between text-xs font-medium">
                      <span>Net Balance / In-Hand:</span>
                      <span
                        className={`font-mono font-bold ${
                          isPositive ? 'text-foreground' : 'text-rose-600'
                        }`}
                      >
                        {formatINR(net)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Payment Method Ledger Summary</CardTitle>
              <CardDescription className="text-xs">
                Detailed side-by-side reconciliation of all payments received and disbursed by payment channel
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Channel</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Total Inflow (+₹)</TableHead>
                    <TableHead className="text-right">Total Outflow (-₹)</TableHead>
                    <TableHead className="text-right">Net Flow (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethodTotals.map((pm) => {
                    const net = pm.incomePaise - pm.expensePaise
                    return (
                      <TableRow key={pm.method}>
                        <TableCell className="font-medium text-xs">{pm.label}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {pm.count}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-emerald-700">
                          {formatINR(pm.incomePaise)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-rose-700">
                          {formatINR(pm.expensePaise)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-xs font-bold ${
                            net < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {net >= 0 ? '+' : ''}
                          {formatINR(net)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Periodic Totals */}
        <TabsContent value="periods" className="space-y-4">
          <IncomeExpenseChart
            data={periodTotals}
            title="Periodic Inflow vs Outflow"
            description="Daily and monthly trend comparison"
          />

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary by Period</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expense</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodTotals.map((pt) => {
                    const net = pt.incomePaise - pt.expensePaise
                    return (
                      <TableRow key={pt.period}>
                        <TableCell className="font-medium text-xs font-mono">{pt.period}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-700">
                          {formatINR(pt.incomePaise)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-700">
                          {formatINR(pt.expensePaise)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-xs font-semibold ${
                            net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {net >= 0 ? '+' : '-'}
                          {formatINR(Math.abs(net))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Category Breakdown */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Expense Categories */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base text-rose-800 dark:text-rose-300">
                  Expenses by Category
                </CardTitle>
                <CardDescription className="text-xs">
                  Where organization funds were spent
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {expenseCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No expenses recorded</p>
                ) : (
                  expenseCategories.map((c) => {
                    const pct = Math.round((c.totalPaise / totalExpensePaise) * 100)
                    return (
                      <div key={c.category_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{c.category_name}</span>
                          <span className="font-mono font-semibold text-rose-700 dark:text-rose-400">
                            {formatINR(c.totalPaise)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{c.count} transactions</p>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Income Categories */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base text-emerald-800 dark:text-emerald-300">
                  Income by Category
                </CardTitle>
                <CardDescription className="text-xs">
                  Sources of received organizational funds
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {incomeCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No income recorded</p>
                ) : (
                  incomeCategories.map((c) => {
                    const pct = Math.round((c.totalPaise / totalIncomePaise) * 100)
                    return (
                      <div key={c.category_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{c.category_name}</span>
                          <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatINR(c.totalPaise)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{c.count} transactions</p>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 5: Sources & Payees */}
        <TabsContent value="parties" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Donors / Income Sources */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Top Income Sources</CardTitle>
                <CardDescription className="text-xs">
                  Persons and institutions contributing funds
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {incomeSources.length === 0 ? (
                  <p className="p-6 text-xs text-muted-foreground">No identified sources recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Party / Source</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Total Inflow</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeSources.map((s) => (
                        <TableRow key={s.person_name}>
                          <TableCell className="font-medium text-xs">{s.person_name}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {s.count}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-700">
                            {formatINR(s.totalPaise)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Top Payees / Vendors */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Top Expenditure Recipients</CardTitle>
                <CardDescription className="text-xs">
                  Vendors, contractors, and individuals paid
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {expensePayees.length === 0 ? (
                  <p className="p-6 text-xs text-muted-foreground">No payees recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient / Vendor</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Total Outflow</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensePayees.map((p) => (
                        <TableRow key={p.person_name}>
                          <TableCell className="font-medium text-xs">{p.person_name}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {p.count}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-rose-700">
                            {formatINR(p.totalPaise)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
