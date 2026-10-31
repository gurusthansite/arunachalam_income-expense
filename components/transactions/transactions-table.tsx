'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  MessageCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { deleteTransaction } from '@/app/actions/transactions'
import { formatDate } from '@/lib/dates'
import { formatINR } from '@/lib/money'
import {
  paymentMethodLabel,
  getTxPaidPaise,
  getTxPendingPaise,
  getTxPaymentStatus,
  type Category,
  type Transaction,
  type TxType,
} from '@/lib/types'

interface TransactionsTableProps {
  transactions: Transaction[]
  totalCount: number
  page: number
  pageSize: number
  categories: Category[]
  currentFilters: {
    q: string
    type: string
    status?: string
    categoryId: string
    sort: 'date' | 'amount'
    dir: 'asc' | 'desc'
    from?: string | null
    to?: string | null
    range?: string
  }
}

function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
}

function getWhatsAppUrl(tx: Transaction): string {
  if (!tx.contact_number) return '#'
  const phone = cleanPhoneForWhatsApp(tx.contact_number)
  const party = tx.person_name ? tx.person_name.trim() : 'Sir/Madam'
  const isIncome = tx.type === 'income'
  const pendingPaise = getTxPendingPaise(tx)
  const totalStr = formatINR(Math.abs(tx.amountPaise))

  let msg = `Hi ${party}, `
  if (!isIncome && pendingPaise > 0) {
    const pendingStr = formatINR(pendingPaise)
    msg += `this is regarding the bill of ₹${totalStr} (${tx.category_name}). Pending balance due is ₹${pendingStr}.`
  } else {
    msg += `this is regarding your transaction of ₹${totalStr} for ${tx.category_name} recorded on ${formatDate(tx.transaction_date)}.`
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

export function TransactionsTable({
  transactions,
  totalCount,
  page,
  pageSize,
  categories,
  currentFilters,
}: TransactionsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(currentFilters.q)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '') params.delete(k)
      else params.set(k, v)
    })
    // Reset to page 1 on filter changes unless page itself is changed
    if (!('page' in updates)) {
      params.delete('page')
    }
    router.push(`?${params.toString()}`)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateQuery({ q: searchInput.trim() || null })
  }

  async function handleDeleteConfirm() {
    if (!deletingTx) return
    setIsDeleting(true)
    try {
      const result = await deleteTransaction(deletingTx.id)
      if (result.ok) {
        toast.success('Transaction deleted successfully.')
        setDeletingTx(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete transaction.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting transaction.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Calculate live summary metrics for currently visible transactions
  const summaryMetrics = transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'income') {
        acc.incomePaise += tx.amountPaise
        acc.incomeCount += 1
      } else {
        const paid = getTxPaidPaise(tx)
        const pending = getTxPendingPaise(tx)
        acc.paidExpensePaise += paid
        acc.pendingExpensePaise += pending
        acc.totalExpensePaise += tx.amountPaise
        if (pending > 0) acc.pendingCount += 1
        else acc.paidCount += 1
      }
      return acc
    },
    {
      incomePaise: 0,
      paidExpensePaise: 0,
      pendingExpensePaise: 0,
      totalExpensePaise: 0,
      incomeCount: 0,
      paidCount: 0,
      pendingCount: 0,
    }
  )

  const hasActiveFilters = Boolean(
    currentFilters.q ||
    currentFilters.type ||
    currentFilters.status ||
    currentFilters.categoryId ||
    currentFilters.range ||
    currentFilters.from ||
    currentFilters.to
  )

  // Active filter tab helper
  const currentTab = (() => {
    if (currentFilters.type === 'income') return 'income'
    if (currentFilters.status === 'pending' || currentFilters.status === 'partial') return 'pending'
    if (currentFilters.status === 'paid' && currentFilters.type === 'expense') return 'paid'
    return 'all'
  })()

  return (
    <div className="space-y-4">
      {/* Premium Mini-Summary Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Total Inflow */}
        <div className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] via-background to-background p-4 shadow-2xs transition-all hover:border-emerald-500/35">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
              Total Inflow (Income)
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tracking-tight text-emerald-900 dark:text-emerald-300">
              +₹{formatINR(summaryMetrics.incomePaise)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {summaryMetrics.incomeCount} income {summaryMetrics.incomeCount === 1 ? 'entry' : 'entries'} on this page
          </div>
        </div>

        {/* Cash Outflow (Paid) */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-500/20 bg-gradient-to-br from-slate-500/[0.05] via-background to-background p-4 shadow-2xs transition-all hover:border-slate-500/35">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Cash Outflow (Paid)
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <TrendingDown className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              -₹{formatINR(summaryMetrics.paidExpensePaise)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {summaryMetrics.paidCount} fully settled expense {summaryMetrics.paidCount === 1 ? 'bill' : 'bills'}
          </div>
        </div>

        {/* Pending Outstandings (Due) */}
        <div
          onClick={() => {
            if (currentTab !== 'pending') {
              updateQuery({ status: 'pending', type: 'expense' })
            }
          }}
          className={cn(
            'group relative cursor-pointer overflow-hidden rounded-xl border p-4 shadow-2xs transition-all',
            summaryMetrics.pendingExpensePaise > 0
              ? 'border-rose-500/30 bg-gradient-to-br from-rose-500/[0.08] via-background to-background hover:border-rose-500/50 hover:shadow-xs'
              : 'border-slate-500/20 bg-card'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-rose-800 dark:text-rose-400">
                Pending / Unpaid Due
              </span>
              {summaryMetrics.pendingCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                  {summaryMetrics.pendingCount} Due
                </span>
              )}
            </div>
            <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tracking-tight text-rose-900 dark:text-rose-300">
              ₹{formatINR(summaryMetrics.pendingExpensePaise)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{summaryMetrics.pendingCount > 0 ? 'Requires settlement' : 'All current bills cleared'}</span>
            <span className="font-medium text-rose-600 underline-offset-2 group-hover:underline dark:text-rose-400">
              {currentTab === 'pending' ? 'Filtering Active' : 'Click to Filter →'}
            </span>
          </div>
        </div>
      </div>

      {/* Modern Filter Ribbon with Segmented Tabs */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-2xs">
        {/* Quick Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* All */}
            <button
              type="button"
              onClick={() => updateQuery({ type: null, status: null })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                currentTab === 'all'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span>All Transactions</span>
              <span className={cn('rounded-md px-1.5 py-0.2 text-[10px]', currentTab === 'all' ? 'bg-background/20 text-background' : 'bg-background text-muted-foreground')}>
                {totalCount}
              </span>
            </button>

            {/* Income */}
            <button
              type="button"
              onClick={() => updateQuery({ type: 'income', status: null })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                currentTab === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
              )}
            >
              <ArrowDownLeft className="size-3" />
              <span>Income</span>
            </button>

            {/* Fully Paid */}
            <button
              type="button"
              onClick={() => updateQuery({ type: 'expense', status: 'paid' })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                currentTab === 'paid'
                  ? 'bg-slate-800 text-white shadow-xs font-semibold dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span>Fully Paid</span>
            </button>

            {/* Pending / Unpaid */}
            <button
              type="button"
              onClick={() => updateQuery({ type: 'expense', status: 'pending' })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                currentTab === 'pending'
                  ? 'bg-rose-600 text-white shadow-xs font-semibold'
                  : 'border border-rose-400/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300'
              )}
            >
              <AlertCircle className="size-3 text-rose-600 dark:text-rose-400" />
              <span>Pending / Due</span>
              {summaryMetrics.pendingCount > 0 && (
                <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-bold', currentTab === 'pending' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white')}>
                  {summaryMetrics.pendingCount}
                </span>
              )}
            </button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchInput('')
                router.push('/transactions')
              }}
            >
              <FilterX className="mr-1 size-3" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Search & Fine Controls */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by vendor, person, phone #, note, or reference…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 pl-9 pr-20 text-xs"
            />
            {searchInput && (
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 px-2 text-xs text-primary"
              >
                Search
              </Button>
            )}
          </form>

          {/* Category Filter */}
          <select
            aria-label="Filter by category"
            value={currentFilters.categoryId}
            onChange={(e) => updateQuery({ categoryId: e.target.value || null })}
            className="h-9 max-w-[170px] rounded-lg border border-input bg-background px-3 text-xs font-medium shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            aria-label="Sort transactions"
            value={`${currentFilters.sort}-${currentFilters.dir}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split('-')
              updateQuery({ sort, dir })
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="amount-desc">Amount (Highest First)</option>
            <option value="amount-asc">Amount (Lowest First)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table with Premium Rows */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {transactions.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            {hasActiveFilters ? (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FilterX className="size-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-base font-semibold">No matching transactions found</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Try clearing your search query or switching filter tabs to see all transactions.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-8 text-xs"
                  onClick={() => {
                    setSearchInput('')
                    router.push('/transactions')
                  }}
                >
                  Clear All Filters
                </Button>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileSpreadsheet className="size-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-base font-semibold">No transactions recorded yet</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Begin tracking your organization finances by recording an income or expense entry.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href="/income/new"
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'h-8 gap-1 bg-emerald-700 text-xs text-white hover:bg-emerald-800'
                    )}
                  >
                    <ArrowDownLeft className="size-3.5" /> Add Income
                  </Link>
                  <Link
                    href="/expense/new"
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'h-8 gap-1 bg-rose-700 text-xs text-white hover:bg-rose-800'
                    )}
                  >
                    <ArrowUpRight className="size-3.5" /> Add Expense
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[105px] font-semibold text-xs">Date</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs">Type</TableHead>
                  <TableHead className="w-[140px] font-semibold text-xs">Category</TableHead>
                  <TableHead className="font-semibold text-xs">Party / Vendor</TableHead>
                  <TableHead className="w-[150px] font-semibold text-xs">Contact / WhatsApp</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs">Method</TableHead>
                  <TableHead className="w-[130px] text-right font-semibold text-xs whitespace-nowrap">Total Bill</TableHead>
                  <TableHead className="w-[180px] text-right font-semibold text-xs whitespace-nowrap">Payment Breakdown</TableHead>
                  <TableHead className="w-[85px] text-center font-semibold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'income'
                  const paidPaise = getTxPaidPaise(tx)
                  const pendingPaise = getTxPendingPaise(tx)
                  const isFullyPaid = pendingPaise <= 0
                  const isUnpaid = !isIncome && paidPaise <= 0
                  const isPartial = !isIncome && paidPaise > 0 && pendingPaise > 0

                  // Calculate paid percentage for the mini progress bar
                  const totalPaise = Math.max(1, Math.abs(tx.amountPaise))
                  const paidPercent = Math.min(100, Math.max(0, Math.round((paidPaise / totalPaise) * 100)))

                  return (
                    <TableRow
                      key={tx.id}
                      className={cn(
                        'transition-colors',
                        // Left accent border & subtle row shade
                        isIncome && 'border-l-[3.5px] border-l-emerald-500 hover:bg-emerald-500/[0.04]',
                        isFullyPaid && !isIncome && 'border-l-[3.5px] border-l-slate-300 hover:bg-muted/40 dark:border-l-slate-700',
                        isPartial && 'border-l-[3.5px] border-l-amber-500 bg-amber-500/[0.025] hover:bg-amber-500/[0.06]',
                        isUnpaid && 'border-l-[3.5px] border-l-rose-500 bg-rose-500/[0.035] hover:bg-rose-500/[0.07]'
                      )}
                    >
                      {/* Date */}
                      <TableCell className="text-xs whitespace-nowrap">
                        <span className="font-semibold text-foreground">
                          {formatDate(tx.transaction_date)}
                        </span>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[11px] font-medium px-2 py-0.5',
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

                      {/* Category */}
                      <TableCell className="text-xs">
                        <span className="font-medium text-foreground">{tx.category_name}</span>
                      </TableCell>

                      {/* Party / Vendor & Notes */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground">
                          {tx.person_name || <span className="font-normal text-muted-foreground/60">—</span>}
                        </div>
                        {tx.description && (
                          <div
                            className="mt-0.5 max-w-[200px] truncate text-[11px] text-muted-foreground"
                            title={tx.description}
                          >
                            {tx.description}
                          </div>
                        )}
                        {tx.reference_number && (
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
                            Ref: {tx.reference_number}
                          </div>
                        )}
                      </TableCell>

                      {/* Contact & WhatsApp Action */}
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {tx.contact_number ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${tx.contact_number}`}
                              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                              title="Click to Call"
                            >
                              <Phone className="size-3 text-muted-foreground" />
                              <span>{tx.contact_number}</span>
                            </a>
                            <a
                              href={getWhatsAppUrl(tx)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 transition-colors hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="size-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      {/* Payment Method */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {paymentMethodLabel(tx.payment_method)}
                      </TableCell>

                      {/* Total Amount / Total Bill */}
                      <TableCell
                        className={`text-right font-mono text-xs font-bold whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-foreground'
                        }`}
                      >
                        {isIncome ? `+₹${formatINR(Math.abs(tx.amountPaise))}` : `₹${formatINR(Math.abs(tx.amountPaise))}`}
                      </TableCell>

                      {/* Payment Breakdown (Paid vs Pending) */}
                      <TableCell className="text-right whitespace-nowrap">
                        {isIncome ? (
                          <div className="flex flex-col items-end">
                            <Badge
                              variant="outline"
                              className="border-emerald-500/25 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="mr-1 size-2.5" /> Received
                            </Badge>
                            <span className="mt-0.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                              +₹{formatINR(paidPaise)}
                            </span>
                          </div>
                        ) : isFullyPaid ? (
                          <div className="flex flex-col items-end">
                            <Badge
                              variant="outline"
                              className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="mr-1 size-2.5 text-emerald-600" /> Fully Settled
                            </Badge>
                            <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                              -₹{formatINR(paidPaise)} paid
                            </span>
                          </div>
                        ) : isPartial ? (
                          <div className="flex flex-col items-end">
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-800 dark:text-amber-300"
                            >
                              <Clock className="mr-1 size-2.5 text-amber-600" /> ₹{formatINR(pendingPaise)} Due
                            </Badge>
                            {/* Two-tone Mini Progress Bar */}
                            <div className="mt-1 flex h-1.5 w-24 overflow-hidden rounded-full bg-amber-500/20">
                              <div
                                style={{ width: `${paidPercent}%` }}
                                className="bg-emerald-500"
                                title={`Paid: ${paidPercent}%`}
                              />
                              <div
                                style={{ width: `${100 - paidPercent}%` }}
                                className="bg-amber-500"
                                title={`Due: ${100 - paidPercent}%`}
                              />
                            </div>
                            <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              ₹{formatINR(paidPaise)} paid ({paidPercent}%)
                            </span>
                          </div>
                        ) : (
                          /* Fully Unpaid */
                          <div className="flex flex-col items-end">
                            <Badge
                              variant="outline"
                              className="border-rose-500/35 bg-rose-500/15 text-[10px] font-bold text-rose-800 dark:text-rose-300 animate-pulse"
                            >
                              <AlertCircle className="mr-1 size-2.5 text-rose-600 dark:text-rose-400" /> ₹{formatINR(pendingPaise)} Unpaid
                            </Badge>
                            {/* 100% Unpaid Progress Bar */}
                            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-rose-500/20">
                              <div className="h-full w-full bg-rose-500" />
                            </div>
                            <span className="mt-0.5 font-mono text-[10px] text-rose-700 dark:text-rose-400">
                              ₹0.00 paid
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'size-7 transition-colors',
                              !isIncome && pendingPaise > 0
                                ? 'text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setEditingTx(tx)}
                            title={!isIncome && pendingPaise > 0 ? 'Settle / Edit Payment' : 'Edit Transaction'}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeletingTx(tx)}
                            title="Delete Transaction"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-foreground">{Math.min(page * pageSize, totalCount)}</span> of{' '}
              <span className="font-semibold text-foreground">{totalCount}</span> transactions
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2.5 text-xs"
                disabled={page <= 1}
                onClick={() => updateQuery({ page: String(page - 1) })}
              >
                <ChevronLeft className="size-3.5" /> Previous
              </Button>
              <span className="px-1 text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2.5 text-xs"
                disabled={page >= totalPages}
                onClick={() => updateQuery({ page: String(page + 1) })}
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={Boolean(editingTx)} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-6 sm:max-w-2xl">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-lg">Edit {editingTx?.type === 'income' ? 'Income' : 'Expense'}</DialogTitle>
            <DialogDescription className="text-xs">
              Make changes to the transaction details below. Totals and balance impact recalculate automatically.
            </DialogDescription>
          </DialogHeader>
          {editingTx && (
            <div className="py-2">
              <TransactionForm
                type={editingTx.type}
                categories={categories.filter((c) => c.type === editingTx.type || c.id === editingTx.category_id)}
                initialData={editingTx}
                onSuccess={() => {
                  setEditingTx(null)
                  router.refresh()
                }}
                onCancel={() => setEditingTx(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deletingTx)} onOpenChange={(open) => !open && setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this {deletingTx?.type} transaction of{' '}
              <strong className="text-foreground">{deletingTx ? formatINR(deletingTx.amountPaise) : ''}</strong> from{' '}
              {deletingTx?.category_name}? This will immediately adjust your organization totals and balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? 'Deleting…' : 'Delete Transaction'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
