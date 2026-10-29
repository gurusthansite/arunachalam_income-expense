import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Add Income',
}

export default async function AddIncomePage() {
  const allCategories = await getCategories({ activeOnly: true })
  const incomeCategories = allCategories.filter((c) => c.type === 'income')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Add Income"
        description="Record new funds received into the organization's account or cash balance"
      />

      <Card className="shadow-xs border-emerald-500/20">
        <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/10 border-b pb-4">
          <CardTitle className="text-base text-emerald-800 dark:text-emerald-300">
            Income Entry Details
          </CardTitle>
          <CardDescription className="text-xs">
            Provide the received amount, source, and date. Totals recalculate automatically upon saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <TransactionForm type="income" categories={incomeCategories} />
        </CardContent>
      </Card>
    </div>
  )
}
