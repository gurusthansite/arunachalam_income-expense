'use server'

import { revalidatePath } from 'next/cache'
import * as excelStorage from '@/lib/excel-storage'
import { getGoogleSheetsScriptUrl, postGoogleSheetsAction } from '@/lib/google-sheets'
import { flattenErrors, transactionSchema, type TransactionInput } from '@/lib/validation'
import { getCategories } from '@/lib/data'
import type { ActionResult } from '@/lib/types'

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

  try {
    // 1. Save to Google Sheets if connected
    if (getGoogleSheetsScriptUrl()) {
      await postGoogleSheetsAction({
        action: 'addTransaction',
        date: values.transaction_date,
        type: values.type,
        amount: values.amount,
        category: catCheck.name,
        party: values.person_name || '',
        paymentMethod: values.payment_method,
        referenceNumber: values.reference_number || '',
        description: values.description || '',
      })
    }

    // 2. Save to local Excel backup
    await excelStorage.createTransaction({
      type: values.type,
      transaction_date: values.transaction_date,
      amount: values.amount,
      category_id: values.category_id,
      payment_method: values.payment_method,
      person_name: values.person_name,
      description: values.description,
      reference_number: values.reference_number,
    })

    revalidatePath('/', 'layout')
    return { ok: true, message: `${values.type === 'income' ? 'Income' : 'Expense'} saved to Google Sheet!` }
  } catch (error: any) {
    console.error('[transactions] insert failed', error.message)
    return { ok: false, error: 'Could not save the transaction. Please try again.' }
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

  try {
    if (getGoogleSheetsScriptUrl()) {
      await postGoogleSheetsAction({
        action: 'updateTransaction',
        id,
        date: values.transaction_date,
        type: values.type,
        amount: values.amount,
        category: catCheck.name,
        party: values.person_name || '',
        paymentMethod: values.payment_method,
        referenceNumber: values.reference_number || '',
        description: values.description || '',
      })
    }

    await excelStorage.updateTransaction(id, {
      type: values.type,
      transaction_date: values.transaction_date,
      amount: values.amount,
      category_id: values.category_id,
      payment_method: values.payment_method,
      person_name: values.person_name,
      description: values.description,
      reference_number: values.reference_number,
    })

    revalidatePath('/', 'layout')
    return { ok: true, message: 'Transaction updated in Google Sheet!' }
  } catch (error: any) {
    console.error('[transactions] update failed', error.message)
    return { ok: false, error: 'Could not update the transaction. Please try again.' }
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Invalid transaction ID.' }

  try {
    if (getGoogleSheetsScriptUrl()) {
      await postGoogleSheetsAction({
        action: 'deleteTransaction',
        id,
      })
    }

    await excelStorage.deleteTransaction(id)
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Transaction removed from Google Sheet!' }
  } catch (error: any) {
    console.error('[transactions] delete failed', error.message)
    return { ok: false, error: error.message || 'Could not delete the transaction.' }
  }
}
