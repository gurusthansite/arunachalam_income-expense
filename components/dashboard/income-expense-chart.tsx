'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatINRWhole, paiseToNumber } from '@/lib/money'
import type { PeriodTotal } from '@/lib/types'

interface IncomeExpenseChartProps {
  data: PeriodTotal[]
  title?: string
  description?: string
}

function formatPeriodLabel(period: string): string {
  if (period.length === 7) {
    // YYYY-MM
    const [year, month] = period.split('-')
    const dt = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
    return dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  }
  if (period.length === 10) {
    // YYYY-MM-DD
    const [year, month, day] = period.split('-')
    const dt = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  }
  return period
}

export function IncomeExpenseChart({
  data,
  title = 'Income vs Expenses',
  description = 'Comparison of inflow and outflow across time',
}: IncomeExpenseChartProps) {
  const chartData = data.map((d) => ({
    period: formatPeriodLabel(d.period),
    rawPeriod: d.period,
    Income: paiseToNumber(d.incomePaise),
    Expense: paiseToNumber(d.expensePaise),
  }))

  const hasData = chartData.some((d) => d.Income > 0 || d.Expense > 0)

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm font-medium">No transaction activity in this period</p>
            <p className="text-xs mt-1">Recorded income and expenses will display in this chart</p>
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.006 247)" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'oklch(0.5 0.02 255)' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 255)' }}
                  tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]}
                  contentStyle={{
                    backgroundColor: 'oklch(1 0 0)',
                    borderRadius: '8px',
                    borderColor: 'oklch(0.91 0.006 247)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  iconType="circle"
                />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
