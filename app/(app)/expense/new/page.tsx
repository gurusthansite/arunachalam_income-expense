import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Add Expense',
}

export default async function AddExpensePage() {
  const allCategories = await getCategories({ activeOnly: true })
  const expenseCategories = allCategories.filter((c) => c.type === 'expense')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Add Expense"
        description="Record organization expenditures, vendor payments, and operational bills"
      />

      <Card className="shadow-xs border-rose-500/20">
        <CardHeader className="bg-rose-50/50 dark:bg-rose-950/10 border-b pb-4">
          <CardTitle className="text-base text-rose-800 dark:text-rose-300">
            Expense Entry Details
          </CardTitle>
          <CardDescription className="text-xs">
            Provide the expenditure amount, vendor/payee, and category. Totals recalculate automatically upon saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <TransactionForm type="expense" categories={expenseCategories} />
        </CardContent>
      </Card>
    </div>
  )
}
