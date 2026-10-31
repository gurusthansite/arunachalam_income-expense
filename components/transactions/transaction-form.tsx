'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, AlertCircle, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/form-field'
import { SimpleSelect } from '@/components/simple-select'
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
import { createTransaction, updateTransaction } from '@/app/actions/transactions'
import { todayIso } from '@/lib/dates'
import { PAYMENT_METHODS, type Category, type Transaction, type TxType } from '@/lib/types'
import { paiseToDecimalString, formatINR } from '@/lib/money'
import { cn } from '@/lib/utils'

function cleanNumericInput(val: string): string {
  let sanitized = val.replace(/[^0-9.-]/g, '')
  if (sanitized.startsWith('-')) {
    sanitized = '-' + sanitized.slice(1).replace(/-/g, '')
  } else {
    sanitized = sanitized.replace(/-/g, '')
  }
  const parts = sanitized.split('.')
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('')
  }
  return sanitized
}

interface TransactionFormProps {
  type: TxType
  categories: Category[]
  initialData?: Transaction
  onSuccess?: () => void
  onCancel?: () => void
}

export function TransactionForm({
  type,
  categories,
  initialData,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const router = useRouter()
  const isEditing = Boolean(initialData)
  const isIncome = type === 'income'

  const [date, setDate] = useState(initialData?.transaction_date ?? todayIso())
  const [amount, setAmount] = useState(
    initialData ? paiseToDecimalString(initialData.amountPaise) : ''
  )
  const [paidAmount, setPaidAmount] = useState(
    initialData
      ? paiseToDecimalString(initialData.paidPaise !== undefined ? initialData.paidPaise : initialData.amountPaise)
      : ''
  )
  const [hasManuallyEditedPaid, setHasManuallyEditedPaid] = useState(Boolean(initialData))
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? '')
  const [personName, setPersonName] = useState(initialData?.person_name ?? '')
  const [contactNumber, setContactNumber] = useState(initialData?.contact_number ?? '')
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method ?? 'upi')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [referenceNumber, setReferenceNumber] = useState(initialData?.reference_number ?? '')

  // Calculate pending amount in real-time with clean numeric inputs
  const cleanTotalStr = cleanNumericInput(amount)
  const totalNum = parseFloat(cleanTotalStr) || 0

  const cleanPaidStr = cleanNumericInput(paidAmount)
  const effectivePaidStr = !isIncome
    ? (cleanPaidStr === '' ? (hasManuallyEditedPaid ? '0' : cleanTotalStr) : cleanPaidStr)
    : cleanTotalStr
  const paidNum = parseFloat(effectivePaidStr) || 0
  const pendingNum = !isIncome ? Math.max(0, totalNum - paidNum) : 0

  const paidPercent = totalNum > 0 ? Math.min(100, Math.max(0, Math.round((paidNum / totalNum) * 100))) : 0
  const pendingPercent = totalNum > 0 ? Math.max(0, 100 - paidPercent) : 0

  function handleAmountChange(val: string) {
    const cleaned = cleanNumericInput(val)
    setAmount(cleaned)
    if (!hasManuallyEditedPaid && !isIncome) {
      setPaidAmount(cleaned)
    }
  }

  function handlePaidChange(val: string) {
    const cleaned = cleanNumericInput(val)
    setHasManuallyEditedPaid(true)
    setPaidAmount(cleaned)
  }

  function setFullyPaid() {
    setHasManuallyEditedPaid(true)
    setPaidAmount(cleanNumericInput(amount) || '0')
  }

  function setHalfPaid() {
    setHasManuallyEditedPaid(true)
    const t = parseFloat(cleanNumericInput(amount)) || 0
    setPaidAmount((t / 2).toFixed(2))
  }

  function setUnpaid() {
    setHasManuallyEditedPaid(true)
    setPaidAmount('0')
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Check if form has modified inputs
  const isDirty =
    date !== (initialData?.transaction_date ?? todayIso()) ||
    amount !== (initialData ? paiseToDecimalString(initialData.amountPaise) : '') ||
    paidAmount !== (initialData ? paiseToDecimalString(initialData.paidPaise ?? initialData.amountPaise) : '') ||
    categoryId !== (initialData?.category_id ?? '') ||
    personName !== (initialData?.person_name ?? '') ||
    contactNumber !== (initialData?.contact_number ?? '') ||
    paymentMethod !== (initialData?.payment_method ?? 'upi') ||
    description !== (initialData?.description ?? '') ||
    referenceNumber !== (initialData?.reference_number ?? '')

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name + (!c.is_active ? ' (Inactive)' : ''),
  }))

  const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({
    value: m.value,
    label: m.label,
  }))

  function handleCancel() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      if (onCancel) onCancel()
      else router.push('/transactions')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    setFieldErrors({})
    setGeneralError(null)

    // Quick client validations
    const errors: Record<string, string> = {}
    if (!date) errors.transaction_date = 'Transaction date is required'
    if (!amount || isNaN(Number(amount))) {
      errors.amount = 'Enter a valid amount'
    }
    if (!isIncome && paidAmount !== '' && isNaN(Number(paidAmount))) {
      errors.paid_amount = 'Enter a valid paid amount'
    }
    if (!categoryId) errors.category_id = 'Please select a category'
    if (!paymentMethod) errors.payment_method = 'Please select a payment method'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        type,
        transaction_date: date,
        amount,
        paid_amount: !isIncome ? (paidAmount === '' ? amount : paidAmount) : amount,
        pending_amount: !isIncome ? String(pendingNum) : '0',
        category_id: categoryId,
        payment_method: paymentMethod,
        person_name: personName.trim() || null,
        contact_number: contactNumber.trim() || null,
        description: description.trim() || null,
        reference_number: referenceNumber.trim() || null,
      }

      let res
      if (isEditing && initialData) {
        res = await updateTransaction(initialData.id, payload)
      } else {
        res = await createTransaction(payload)
      }

      if (!res.ok) {
        setGeneralError(res.error)
        if (res.fieldErrors) setFieldErrors(res.fieldErrors)
        setIsSubmitting(false)
        return
      }

      toast.success(
        res.message ??
          (isIncome
            ? isEditing ? 'Income updated successfully' : 'Income recorded successfully'
            : isEditing ? 'Expense updated successfully' : 'Expense recorded successfully')
      )

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/transactions')
        router.refresh()
      }
    } catch (err: any) {
      setGeneralError(err.message || 'An unexpected error occurred.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {generalError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Transaction Date */}
          <FormField
            id="transaction_date"
            label="Date"
            required
            error={fieldErrors.transaction_date}
          >
            <Input
              id="transaction_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
              required
            />
          </FormField>

          {/* Total Amount / Total Expense */}
          <FormField
            id="amount"
            label={isIncome ? 'Income Amount (₹)' : 'Total Expense (₹)'}
            required
            error={fieldErrors.amount}
            hint={isIncome ? 'Enter total income received' : 'Enter the full bill or incurred expense amount'}
          >
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">₹</span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="h-10 pl-8 font-mono text-base font-medium"
                required
              />
            </div>
          </FormField>

          {/* Paid & Payment Method Section for Expenses */}
          {!isIncome && (
            <>
              {/* Paid Amount */}
              <FormField
                id="paid_amount"
                label="Paid Amount (₹)"
                required
                error={fieldErrors.paid_amount}
                hint={
                  <span className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Quick set:</span>
                    <button
                      type="button"
                      onClick={setFullyPaid}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50 cursor-pointer border border-border"
                    >
                      Fully Paid
                    </button>
                    <button
                      type="button"
                      onClick={setHalfPaid}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 cursor-pointer border border-border"
                    >
                      50% / Half
                    </button>
                    <button
                      type="button"
                      onClick={setUnpaid}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100/50 cursor-pointer border border-border"
                    >
                      Unpaid / ₹0
                    </button>
                  </span>
                }
              >
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">₹</span>
                  <Input
                    id="paid_amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => handlePaidChange(e.target.value)}
                    className="h-10 pl-8 font-mono text-base font-semibold"
                  />
                </div>
              </FormField>

              {/* Payment Method */}
              <FormField
                id="payment_method"
                label="Payment Method"
                required
                error={fieldErrors.payment_method}
              >
                <SimpleSelect
                  id="payment_method"
                  options={paymentMethodOptions}
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  placeholder="Select method…"
                />
              </FormField>

              {/* HIGH-VISIBILITY PAYMENT BREAKDOWN & BALANCE IMPACT SHOWCASE CARD */}
              <div className="sm:col-span-2 rounded-xl border border-border/80 bg-gradient-to-b from-card via-card to-muted/20 p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Breakdown & Balance Impact
                    </span>
                  </div>
                  {pendingNum <= 0 && totalNum > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="size-3.5" /> Fully Paid
                    </span>
                  ) : paidNum > 0 && pendingNum > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <Clock className="size-3.5" /> Partially Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      <AlertTriangle className="size-3.5" /> Unpaid / Due
                    </span>
                  )}
                </div>

                {/* 3 Prominent Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Total Expense */}
                  <div className="rounded-lg border bg-background/80 p-3 flex flex-col justify-between shadow-2xs">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Expense
                    </span>
                    <span className="text-xl font-extrabold font-mono text-foreground mt-1">
                      ₹{totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      Full incurred invoice/bill
                    </span>
                  </div>

                  {/* Paid Amount */}
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 flex flex-col justify-between shadow-2xs">
                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Paid (Cash Outflow)
                    </span>
                    <span className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                      ₹{paidNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
                      Deducted from cash balance
                    </span>
                  </div>

                  {/* Pending / Due */}
                  <div
                    className={cn(
                      'rounded-lg border p-3 flex flex-col justify-between shadow-2xs',
                      pendingNum > 0
                        ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20'
                        : 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-semibold uppercase tracking-wider',
                        pendingNum > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'
                      )}
                    >
                      Pending / Due
                    </span>
                    <span
                      className={cn(
                        'text-xl font-extrabold font-mono mt-1',
                        pendingNum > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                      )}
                    >
                      ₹{pendingNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] mt-0.5',
                        pendingNum > 0 ? 'text-rose-800/80 dark:text-rose-400/80' : 'text-muted-foreground'
                      )}
                    >
                      {pendingNum > 0 ? 'Owed to vendor / Payable' : 'Zero balance due'}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Split Bar */}
                {totalNum > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Paid: {paidPercent}% (₹{paidNum.toFixed(2)})
                      </span>
                      <span className={pendingNum > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}>
                        Due: {pendingPercent}% (₹{pendingNum.toFixed(2)})
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted flex border">
                      <div
                        style={{ width: `${paidPercent}%` }}
                        className="bg-emerald-600 transition-all duration-300"
                        title={`Paid: ₹${paidNum.toFixed(2)} (${paidPercent}%)`}
                      />
                      <div
                        style={{ width: `${pendingPercent}%` }}
                        className="bg-rose-500 transition-all duration-300"
                        title={`Pending: ₹${pendingNum.toFixed(2)} (${pendingPercent}%)`}
                      />
                    </div>
                  </div>
                )}

                {/* Explanatory Cash Balance Impact Note */}
                <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground flex items-center gap-2 border border-border/40">
                  <span className="text-base shrink-0">💡</span>
                  <span>
                    {pendingNum <= 0 && totalNum > 0
                      ? `Fully Paid: ₹${totalNum.toFixed(2)} is subtracted from your Cash Balance immediately. Nothing is owed.`
                      : paidNum > 0
                        ? `Partial Payment: Only ₹${paidNum.toFixed(2)} is subtracted from your Cash Balance today. The remaining ₹${pendingNum.toFixed(2)} will stay recorded as Pending/Due.`
                        : `Credit/Unpaid: ₹0.00 is deducted from your Cash Balance today. The full ₹${totalNum.toFixed(2)} remains Pending/Due until paid.`}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Payment Method for Income Only (for Expense it is shown next to Paid) */}
          {isIncome && (
            <FormField
              id="payment_method"
              label="Payment Method"
              required
              error={fieldErrors.payment_method}
            >
              <SimpleSelect
                id="payment_method"
                options={paymentMethodOptions}
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                placeholder="Select method…"
              />
            </FormField>
          )}

          {/* Category */}
          <FormField
            id="category_id"
            label={`${isIncome ? 'Income' : 'Expense'} Category`}
            required
            error={fieldErrors.category_id}
          >
            <SimpleSelect
              id="category_id"
              options={categoryOptions}
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder={`Select ${type} category…`}
              invalid={Boolean(fieldErrors.category_id)}
            />
          </FormField>

          {/* Received from / Paid to */}
          <FormField
            id="person_name"
            label={isIncome ? 'Received From (Person / Org)' : 'Paid To (Vendor / Person)'}
            error={fieldErrors.person_name}
            hint="Optional source or recipient"
          >
            <Input
              id="person_name"
              type="text"
              placeholder={isIncome ? 'e.g. John Doe / Tata Trust' : 'e.g. Office Supplies Co. / Electric Dept'}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              maxLength={120}
              className="h-10"
            />
          </FormField>

          {/* Contact / Phone Number */}
          <FormField
            id="contact_number"
            label={isIncome ? 'Contact Number (Phone / Mobile)' : 'Vendor / Payee Contact Number'}
            error={fieldErrors.contact_number}
            hint="Optional phone / mobile number"
          >
            <Input
              id="contact_number"
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              maxLength={30}
              className="h-10"
            />
          </FormField>

          {/* Reference / Receipt / Bill Number */}
          <FormField
            id="reference_number"
            label={isIncome ? 'Receipt / Reference Number' : 'Bill / Invoice / Ref Number'}
            error={fieldErrors.reference_number}
            hint="Optional reference or transaction ID"
          >
            <Input
              id="reference_number"
              type="text"
              placeholder={isIncome ? 'e.g. REC-2026-001 or UPI-Ref' : 'e.g. INV-8921 or Chq-40291'}
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              maxLength={60}
              className="h-10"
            />
          </FormField>
        </div>

        {/* Description / Notes */}
        <FormField
          id="description"
          label="Description / Purpose Notes"
          error={fieldErrors.description}
          hint="Optional notes for organization records (up to 500 characters)"
        >
          <Textarea
            id="description"
            rows={3}
            placeholder="Add relevant notes, purpose of this transaction, or breakdown details…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="resize-none"
          />
        </FormField>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="h-10"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={`h-10 gap-2 ${
              isIncome
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-rose-700 hover:bg-rose-800 text-white'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : isIncome ? (
              <>
                <ArrowDownLeft className="size-4" />
                <span>{isEditing ? 'Update Income' : 'Save Income'}</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="size-4" />
                <span>{isEditing ? 'Update Expense' : 'Save Expense'}</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have entered data that has not been saved yet. Leaving this page will discard your changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDiscardConfirm(false)
                if (onCancel) onCancel()
                else router.push('/transactions')
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
