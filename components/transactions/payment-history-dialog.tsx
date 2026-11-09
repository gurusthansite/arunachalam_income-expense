'use client'

import {
  History,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  FileText,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatINR } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { paymentMethodLabel, getTxPaidPaise, getTxPendingPaise, type Transaction } from '@/lib/types'

interface PaymentHistoryDialogProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentHistoryDialog({
  transaction,
  open,
  onOpenChange,
}: PaymentHistoryDialogProps) {
  if (!transaction) return null

  const installments = transaction.payment_history || []
  const totalPaise = transaction.amountPaise
  const paidPaise = getTxPaidPaise(transaction)
  const pendingPaise = getTxPendingPaise(transaction)
  const isFullySettled = pendingPaise <= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <History className="size-4" />
            <span>Installment Payment Audit Trail</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Payment History for {transaction.person_name || transaction.category_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Complete record of all installments made towards this bill. No past data is overwritten.
          </DialogDescription>
        </DialogHeader>

        {/* Bill Overview Card */}
        <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Original Bill Date:</span>
            <span className="font-semibold text-foreground">{formatDate(transaction.transaction_date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Bill Amount:</span>
            <span className="font-mono font-bold text-foreground">{formatINR(totalPaise)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Paid Across All Installments:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(paidPaise)}
            </span>
          </div>
          <div className="border-t pt-2 flex items-center justify-between font-bold text-sm">
            <span>Settlement Status:</span>
            {isFullySettled ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="size-4" />
                ✓ Fully Settled (₹0.00 Due)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs">
                <Clock className="size-4" />
                Due Balance: {formatINR(pendingPaise)}
              </span>
            )}
          </div>
        </div>

        {/* Installment Timeline */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Receipt className="size-3.5" />
            Payment Installments ({installments.length})
          </h4>

          {installments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              No individual installments logged yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {installments.map((inst, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-3.5 shadow-2xs space-y-1.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                        #{inst.installmentNumber}
                      </span>
                      <span className="font-semibold text-xs text-foreground">
                        Payment #{inst.installmentNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0">
                        {paymentMethodLabel(inst.paymentMethod)}
                      </Badge>
                    </div>
                    <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      +{formatINR(inst.amountPaise)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(inst.date)}
                    </span>
                    {inst.referenceNumber && (
                      <span className="font-mono">Ref: {inst.referenceNumber}</span>
                    )}
                    {inst.note && (
                      <span className="italic text-foreground">"{inst.note}"</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
