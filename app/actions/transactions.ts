'use server'

import { revalidatePath } from 'next/cache'
import * as excelStorage from '@/lib/excel-storage'
import { getGoogleSheetsScriptUrl, postGoogleSheetsAction, invalidateGoogleSheetsCache } from '@/lib/google-sheets'
import { flattenErrors, transactionSchema, type TransactionInput } from '@/lib/validation'
import { getCategories, getTransactions } from '@/lib/data'
import type { ActionResult, PaymentInstallment, Transaction } from '@/lib/types'
import { getTxPaidPaise, getTxPendingPaise } from '@/lib/types'
import { toPaise, paiseToDecimalString, formatINR } from '@/lib/money'
import { encodePayments, decodePayments, cleanDescription, getConsolidatedMethod, encodeFullDescription } from '@/lib/installments'

async function validateCategory(
  categoryId: string,
  type: string,
  allowInactive: boolean
): Promise<{ error: string | null; name: string }> {
  const categories = await getCategories()
  const found = categories.find((c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase())
  if (!found) return { error: 'Category not found', name: 'Uncategorized' }
  if (found.type !== type) return { error: `Choose an ${type} category`, name: found.name }
  if (!found.is_active && !allowInactive) return { error: 'This category is inactive', name: found.name }
  return { error: null, name: found.name }
}

export async function createTransaction(input: TransactionInput): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: flattenErrors(parsed.error) }
  }
  const values = parsed.data

  const catCheck = await validateCategory(values.category_id, values.type, false)
  if (catCheck.error) return { ok: false, error: catCheck.error, fieldErrors: { category_id: catCheck.error } }

  const paidVal =
    values.paid_amount !== undefined && values.paid_amount !== null && values.paid_amount !== ''
      ? values.paid_amount
      : values.amount
  const pendingVal =
    values.pending_amount !== undefined && values.pending_amount !== null && values.pending_amount !== ''
      ? values.pending_amount
      : String(Math.max(0, Number(values.amount) - Number(paidVal)))

  const isExpense = values.type === 'expense'
  const metadata = {
    referred_by: values.referred_by || null,
    referred_contact: values.referred_contact || null,
    paid_by: values.paid_by || null,
  }

  let initialInstallments: PaymentInstallment[] | undefined
  if (isExpense && Number(paidVal) > 0) {
    initialInstallments = [
      {
        installmentNumber: 1,
        amountPaise: toPaise(paidVal),
        date: values.transaction_date,
        paymentMethod: values.payment_method,
        referenceNumber: values.reference_number || null,
        paidBy: values.paid_by || null,
        note: Number(pendingVal) > 0 ? 'Initial / Advance Payment' : 'Full Payment',
        createdAt: new Date().toISOString(),
      },
    ]
  }

  const fullDescription = encodeFullDescription({
    cleanNotes: values.description,
    metadata,
    payments: initialInstallments,
  })

  try {
    // 1. Save to Google Sheets if connected
    if (getGoogleSheetsScriptUrl()) {
      const gRes = await postGoogleSheetsAction({
        action: 'addTransaction',
        date: values.transaction_date,
        type: values.type,
        amount: values.amount,
        paid: paidVal,
        pending: pendingVal,
        category: catCheck.name,
        party: values.person_name || '',
        contactNumber: values.contact_number || '',
        paymentMethod: values.payment_method,
        referenceNumber: values.reference_number || '',
        description: fullDescription,
      })
      if (gRes && !gRes.ok) {
        throw new Error(gRes.error || 'Failed to save to Google Sheets')
      }
    }

    // 2. Save to local Excel backup (safe wrapper for read-only serverless environments like Vercel)
    try {
      await excelStorage.createTransaction({
        type: values.type,
        transaction_date: values.transaction_date,
        amount: values.amount,
        paid_amount: paidVal,
        pending_amount: pendingVal,
        category_id: values.category_id,
        payment_method: values.payment_method,
        person_name: values.person_name,
        contact_number: values.contact_number,
        description: fullDescription,
        reference_number: values.reference_number,
      })
    } catch (excelErr: any) {
      console.warn('[excel-storage] local file write skipped (read-only filesystem):', excelErr.message)
    }

    invalidateGoogleSheetsCache()
    revalidatePath('/', 'layout')
    return { ok: true, message: `${values.type === 'income' ? 'Income' : 'Expense'} saved successfully!` }
  } catch (error: any) {
    console.error('[transactions] insert failed:', error.message)
    return { ok: false, error: error.message || 'Could not save the transaction. Please try again.' }
  }
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Invalid transaction ID.' }

  const parsed = transactionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: flattenErrors(parsed.error) }
  }
  const values = parsed.data

  const catCheck = await validateCategory(values.category_id, values.type, true)
  if (catCheck.error) return { ok: false, error: catCheck.error, fieldErrors: { category_id: catCheck.error } }

  const paidVal =
    values.paid_amount !== undefined && values.paid_amount !== null && values.paid_amount !== ''
      ? values.paid_amount
      : values.amount
  const pendingVal =
    values.pending_amount !== undefined && values.pending_amount !== null && values.pending_amount !== ''
      ? values.pending_amount
      : String(Math.max(0, Number(values.amount) - Number(paidVal)))

  try {
    // Preserve existing payment history and metadata
    const { rows: allTx } = await getTransactions({ pageSize: 1000, page: 1, sort: 'date', dir: 'desc' })
    const targetTx = allTx.find((t) => t.id === id)
    const existingInstallments =
      targetTx?.payment_history ||
      (targetTx ? decodePayments(targetTx.raw_description || targetTx.description, targetTx) : [])

    const metadata = {
      referred_by: values.referred_by !== undefined ? values.referred_by : (targetTx?.referred_by || null),
      referred_contact: values.referred_contact !== undefined ? values.referred_contact : (targetTx?.referred_contact || null),
      paid_by: values.paid_by !== undefined ? values.paid_by : (targetTx?.paid_by || null),
    }

    const fullDescription = encodeFullDescription({
      cleanNotes: values.description,
      metadata,
      payments: existingInstallments.length > 0 ? existingInstallments : undefined,
    })

    if (getGoogleSheetsScriptUrl()) {
      const gRes = await postGoogleSheetsAction({
        action: 'updateTransaction',
        id,
        date: values.transaction_date,
        type: values.type,
        amount: values.amount,
        paid: paidVal,
        pending: pendingVal,
        category: catCheck.name,
        party: values.person_name || '',
        contactNumber: values.contact_number || '',
        paymentMethod: values.payment_method,
        referenceNumber: values.reference_number || '',
        description: fullDescription,
      })
      if (gRes && !gRes.ok) {
        throw new Error(gRes.error || 'Failed to update in Google Sheets')
      }
    }

    try {
      await excelStorage.updateTransaction(id, {
        type: values.type,
        transaction_date: values.transaction_date,
        amount: values.amount,
        paid_amount: paidVal,
        pending_amount: pendingVal,
        category_id: values.category_id,
        payment_method: values.payment_method,
        person_name: values.person_name,
        contact_number: values.contact_number,
        description: fullDescription,
        reference_number: values.reference_number,
      })
    } catch (excelErr: any) {
      console.warn('[excel-storage] local file update skipped:', excelErr.message)
    }

    invalidateGoogleSheetsCache()
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Transaction updated successfully!' }
  } catch (error: any) {
    console.error('[transactions] update failed', error.message)
    return { ok: false, error: error.message || 'Could not update the transaction. Please try again.' }
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Invalid transaction ID.' }

  try {
    if (getGoogleSheetsScriptUrl()) {
      const gRes = await postGoogleSheetsAction({
        action: 'deleteTransaction',
        id,
      })
      if (gRes && !gRes.ok) {
        const errMsg = String(gRes.error || '')
        if (!errMsg.toLowerCase().includes('not found')) {
          throw new Error(errMsg || 'Failed to delete from Google Sheets')
        }
      }
    }

    try {
      await excelStorage.deleteTransaction(id)
    } catch (excelErr: any) {
      console.warn('[excel-storage] local file delete skipped:', excelErr.message)
    }

    invalidateGoogleSheetsCache()
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Transaction removed successfully!' }
  } catch (error: any) {
    console.error('[transactions] delete failed', error.message)
    return { ok: false, error: error.message || 'Could not delete the transaction.' }
  }
}

export interface RecordInstallmentInput {
  transactionId: string
  amount: string
  paymentDate: string
  paymentMethod: string
  referenceNumber?: string | null
  note?: string | null
  paidBy?: string | null
}

export async function recordInstallmentPayment(input: RecordInstallmentInput): Promise<ActionResult> {
  if (!input.transactionId) {
    return { ok: false, error: 'Transaction ID is required.' }
  }
  const amtNum = parseFloat(input.amount)
  if (isNaN(amtNum) || amtNum <= 0) {
    return { ok: false, error: 'Please enter a valid payment amount greater than zero.' }
  }
  if (!input.paymentDate) {
    return { ok: false, error: 'Payment date is required.' }
  }
  if (!input.paymentMethod) {
    return { ok: false, error: 'Payment method is required.' }
  }

  try {
    // 1. Fetch current transaction record
    const { rows: allTx } = await getTransactions({ pageSize: 1000, page: 1, sort: 'date', dir: 'desc' })
    const targetTx = allTx.find((t) => t.id === input.transactionId)
    if (!targetTx) {
      return { ok: false, error: 'Transaction record not found.' }
    }

    const currentPendingPaise = getTxPendingPaise(targetTx)
    const newPaymentPaise = toPaise(input.amount)

    if (currentPendingPaise <= 0) {
      return { ok: false, error: 'This transaction is already fully paid.' }
    }

    if (newPaymentPaise > currentPendingPaise) {
      return {
        ok: false,
        error: `Payment amount (${formatINR(newPaymentPaise)}) exceeds remaining balance of ${formatINR(currentPendingPaise)}.`,
      }
    }

    // 2. Decode existing payment installments or synthesize installment #1 from initial advance
    const existingInstallments =
      targetTx.payment_history && targetTx.payment_history.length > 0
        ? targetTx.payment_history
        : decodePayments(targetTx.raw_description || targetTx.description, targetTx)
    const newInstallmentNumber = existingInstallments.length + 1

    const payer = input.paidBy ? input.paidBy.trim() : (targetTx.paid_by || null)

    const newInstallment: PaymentInstallment = {
      installmentNumber: newInstallmentNumber,
      amountPaise: newPaymentPaise,
      date: input.paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber ? input.referenceNumber.trim() : null,
      note: input.note ? input.note.trim() : null,
      paidBy: payer,
      createdAt: new Date().toISOString(),
    }

    const updatedInstallments = [...existingInstallments, newInstallment]
    const currentPaidPaise = getTxPaidPaise(targetTx)
    const updatedPaidPaise = currentPaidPaise + newPaymentPaise
    const updatedPendingPaise = Math.max(0, targetTx.amountPaise - updatedPaidPaise)

    // Compute consolidated payment method (e.g. "Cash + UPI")
    const consolidatedMethod = getConsolidatedMethod(updatedInstallments, targetTx.payment_method)

    // Preserve user clean notes and metadata, encode the full payment history
    const baseNotes = cleanDescription(targetTx.raw_description || targetTx.description)
    const metadata = {
      referred_by: targetTx.referred_by || null,
      referred_contact: targetTx.referred_contact || null,
      paid_by: payer || targetTx.paid_by || null,
    }
    const updatedDescription = encodeFullDescription({
      cleanNotes: baseNotes,
      metadata,
      payments: updatedInstallments,
    })

    // 3. Update in Google Sheets
    if (getGoogleSheetsScriptUrl()) {
      const gRes = await postGoogleSheetsAction({
        action: 'updateTransaction',
        id: targetTx.id,
        date: targetTx.transaction_date, // Keep original bill date
        type: targetTx.type,
        amount: paiseToDecimalString(targetTx.amountPaise),
        paid: paiseToDecimalString(updatedPaidPaise),
        pending: paiseToDecimalString(updatedPendingPaise),
        category: targetTx.category_name,
        party: targetTx.person_name || '',
        contactNumber: targetTx.contact_number || '',
        paymentMethod: consolidatedMethod,
        referenceNumber: targetTx.reference_number || (input.referenceNumber || ''),
        description: updatedDescription,
      })
      if (gRes && !gRes.ok) {
        throw new Error(gRes.error || 'Failed to update Google Sheets')
      }
    }

    // 4. Update in local Excel storage
    try {
      await excelStorage.updateTransaction(targetTx.id, {
        type: targetTx.type,
        transaction_date: targetTx.transaction_date,
        amount: paiseToDecimalString(targetTx.amountPaise),
        paid_amount: paiseToDecimalString(updatedPaidPaise),
        pending_amount: paiseToDecimalString(updatedPendingPaise),
        category_id: targetTx.category_id,
        payment_method: consolidatedMethod,
        person_name: targetTx.person_name,
        contact_number: targetTx.contact_number,
        description: updatedDescription,
        reference_number: targetTx.reference_number || input.referenceNumber,
      })
    } catch (excelErr: any) {
      console.warn('[excel-storage] local file update skipped:', excelErr.message)
    }

    // 5. Invalidate cache and refresh
    invalidateGoogleSheetsCache()
    revalidatePath('/', 'layout')

    const isFullyCleared = updatedPendingPaise === 0
    return {
      ok: true,
      message: isFullyCleared
        ? `Payment of ${formatINR(newPaymentPaise)} recorded! Bill is now fully settled.`
        : `Payment of ${formatINR(newPaymentPaise)} recorded! Remaining due: ${formatINR(updatedPendingPaise)}.`,
    }
  } catch (error: any) {
    console.error('[transactions] record installment failed:', error.message)
    return { ok: false, error: error.message || 'Could not record installment payment.' }
  }
}
