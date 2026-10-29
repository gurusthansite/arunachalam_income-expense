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
import { paymentMethodLabel, type Category, type Transaction, type TxType } from '@/lib/types'

interface TransactionsTableProps {
  transactions: Transaction[]
  totalCount: number
  page: number
  pageSize: number
  categories: Category[]
  currentFilters: {
    q: string
    type: string
    categoryId: string
    sort: 'date' | 'amount'
    dir: 'asc' | 'desc'
    from?: string | null
    to?: string | null
    range?: string
  }
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
      const res = await deleteTransaction(deletingTx.id)
      if (!res.ok) {
        toast.error(res.error || 'Failed to delete transaction.')
      } else {
        toast.success(res.message || 'Transaction deleted successfully')
        setDeletingTx(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting transaction.')
    } finally {
      setIsDeleting(false)
    }
  }

  const hasActiveFilters = Boolean(
    currentFilters.q ||
    currentFilters.type ||
    currentFilters.categoryId ||
    currentFilters.range ||
    currentFilters.from ||
    currentFilters.to
  )

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by description, party, reference #, or category…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 pl-9 pr-20 text-xs"
            />
            {searchInput && (
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 text-xs px-2 text-primary"
              >
                Search
              </Button>
            )}
          </form>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by transaction type"
              value={currentFilters.type}
              onChange={(e) => updateQuery({ type: e.target.value || null })}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">All Types (Income & Expense)</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>

            {/* Category Filter */}
            <select
              aria-label="Filter by category"
              value={currentFilters.categoryId}
              onChange={(e) => updateQuery({ categoryId: e.target.value || null })}
              className="h-9 max-w-[180px] rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
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
              className="h-9 rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (Highest First)</option>
              <option value="amount-asc">Amount (Lowest First)</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchInput('')
                  router.push('/transactions')
                }}
              >
                <FilterX className="size-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        {transactions.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            {hasActiveFilters ? (
              <>
                <p className="text-base font-medium">No matching transactions</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  We couldn't find any transactions matching your active filters. Try adjusting your search query or date range.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1 text-xs"
                  onClick={() => {
                    setSearchInput('')
                    router.push('/transactions')
                  }}
                >
                  <FilterX className="size-3.5" /> Clear All Filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-base font-medium">No transactions recorded yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Record your organization's first transaction using the buttons below.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/income/new"
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'h-8 gap-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white'
                    )}
                  >
                    <ArrowDownLeft className="size-3.5" /> Add Income
                  </Link>
                  <Link
                    href="/expense/new"
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'h-8 gap-1 text-xs bg-rose-700 hover:bg-rose-800 text-white'
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
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Party / Payee</TableHead>
                  <TableHead>Description & Ref</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[90px] text-center">Actions</TableHead>
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
                      <TableCell className="text-xs font-medium">
                        {tx.category_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.person_name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {tx.description ? (
                          <span>{tx.description}</span>
                        ) : null}
                        {tx.reference_number ? (
                          <span className="block text-[11px] font-mono text-muted-foreground/80">
                            Ref: {tx.reference_number}
                          </span>
                        ) : !tx.description ? '—' : null}
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
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingTx(tx)}
                            title="Edit Transaction"
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
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
              Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-foreground">{Math.min(page * pageSize, totalCount)}</span> of{' '}
              <span className="font-medium text-foreground">{totalCount}</span> transactions
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
              <span className="text-xs text-muted-foreground px-1">
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {editingTx?.type === 'income' ? 'Income' : 'Expense'}</DialogTitle>
            <DialogDescription className="text-xs">
              Make changes to the transaction details below. Totals will update upon saving.
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
