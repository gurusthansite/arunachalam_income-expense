'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { recordInstallmentPayment } from '@/app/actions/transactions'
import { formatINR, paiseToDecimalString } from '@/lib/money'
import { formatDate, todayIso } from '@/lib/dates'
import { PAYMENT_METHODS, getTxPaidPaise, getTxPendingPaise, type Transaction } from '@/lib/types'

interface SettleDueDialogProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SettleDueDialog({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: SettleDueDialogProps) {
  const router = useRouter()
  const pendingPaise = transaction ? getTxPendingPaise(transaction) : 0
  const alreadyPaidPaise = transaction ? getTxPaidPaise(transaction) : 0
  const totalPaise = transaction ? transaction.amountPaise : 0

  const [amount, setAmount] = useState(transaction ? paiseToDecimalString(pendingPaise) : '0')
  const [date, setDate] = useState(todayIso())
  const [method, setMethod] = useState('upi')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (transaction && open) {
      setAmount(paiseToDecimalString(getTxPendingPaise(transaction)))
      setDate(todayIso())
      setMethod('upi')
      setReferenceNumber('')
      setNote('')
      setError(null)
    }
  }, [transaction, open])

  if (!transaction) return null

  // Reset when dialog opens for a new transaction
  function handleOpenChange(newOpen: boolean) {
    if (newOpen && transaction) {
      setAmount(paiseToDecimalString(getTxPendingPaise(transaction)))
      setDate(todayIso())
      setMethod('upi')
      setReferenceNumber('')
      setNote('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  function setFullAmount() {
    setAmount(paiseToDecimalString(pendingPaise))
  }

  function setHalfAmount() {
    const half = Math.round(pendingPaise / 2)
    setAmount(paiseToDecimalString(half))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!transaction) return
    setError(null)

    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await recordInstallmentPayment({
        transactionId: transaction.id,
        amount: amount.trim(),
        paymentDate: date,
        paymentMethod: method,
        referenceNumber: referenceNumber.trim() || null,
        note: note.trim() || null,
      })

      if (!res.ok) {
        setError(res.error || 'Failed to record payment.')
        setIsSubmitting(false)
        return
      }

      toast.success(res.message || 'Payment recorded successfully!')
      onOpenChange(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const amtNum = parseFloat(amount) || 0
  const amtPaise = Math.round(amtNum * 100)
  const remainingAfterPayment = Math.max(0, pendingPaise - amtPaise)
  const willBeFullySettled = remainingAfterPayment === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <CreditCard className="size-4" />
            <span>Record Settlement / Installment Payment</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Pay Due for {transaction.person_name || transaction.category_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Log an installment or final payment without losing any previous payment history.
          </DialogDescription>
        </DialogHeader>

        {/* Bill Summary Card */}
        <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Original Bill ({formatDate(transaction.transaction_date)}):</span>
            <span className="font-semibold text-foreground">{formatINR(totalPaise)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Already Paid:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatINR(alreadyPaidPaise)}
            </span>
          </div>
          <div className="border-t pt-2 flex items-center justify-between font-bold text-sm">
            <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Clock className="size-4" /> Balance Due:
            </span>
            <span className="font-mono text-rose-700 dark:text-rose-400 text-base">
              {formatINR(pendingPaise)}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount Input with quick pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment_amount" className="text-xs font-semibold">
                Amount Paying Now (₹) *
              </Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={setFullAmount}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                >
                  Pay Full ({formatINR(pendingPaise)})
                </button>
                {pendingPaise > 1000 && (
                  <button
                    type="button"
                    onClick={setHalfAmount}
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Pay 50%
                  </button>
                )}
              </div>
            </div>
            <Input
              id="payment_amount"
              type="number"
              step="0.01"
              min="0.01"
              max={(pendingPaise / 100).toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="font-mono text-base font-bold h-10"
              required
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
              <span>Remaining balance after this payment:</span>
              <span className={willBeFullySettled ? 'text-emerald-600 font-semibold' : 'font-mono'}>
                {willBeFullySettled ? '✓ Fully Cleared (₹0.00)' : formatINR(remainingAfterPayment)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="payment_date" className="text-xs font-semibold">
                Payment Date *
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label htmlFor="payment_method" className="text-xs font-semibold">
                Payment Method *
              </Label>
              <Select value={method} onValueChange={(val) => setMethod(val || 'upi')}>
                <SelectTrigger id="payment_method" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference # */}
          <div className="space-y-1.5">
            <Label htmlFor="reference_number" className="text-xs font-semibold">
              Reference / Transaction ID <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="reference_number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI Ref / GPay / Cheque #"
              className="h-9 text-xs font-mono"
            />
          </div>

          {/* Note / Memo */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_note" className="text-xs font-semibold">
              Payment Note <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="payment_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Final settlement / 2nd installment"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 sm:justify-between flex-row items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Record Payment of ₹{amtNum > 0 ? amtNum.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
