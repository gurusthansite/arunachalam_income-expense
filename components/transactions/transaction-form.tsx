'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react'
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
import { paiseToDecimalString } from '@/lib/money'

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
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? '')
  const [personName, setPersonName] = useState(initialData?.person_name ?? '')
  const [contactNumber, setContactNumber] = useState(initialData?.contact_number ?? '')
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method ?? 'upi')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [referenceNumber, setReferenceNumber] = useState(initialData?.reference_number ?? '')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Check if form has modified inputs
  const isDirty =
    date !== (initialData?.transaction_date ?? todayIso()) ||
    amount !== (initialData ? paiseToDecimalString(initialData.amountPaise) : '') ||
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
    if (!amount || Number(amount) <= 0 || isNaN(Number(amount))) {
      errors.amount = 'Enter a valid positive amount'
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
            label="Transaction Date"
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

          {/* Amount in INR */}
          <FormField
            id="amount"
            label="Amount (in INR ₹)"
            required
            error={fieldErrors.amount}
            hint="Enter amount (positive, zero, or negative e.g. -500)"
          >
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">₹</span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 pl-8 font-mono text-base"
                required
              />
            </div>
          </FormField>

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
