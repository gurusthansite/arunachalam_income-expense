'use server'

import { revalidatePath } from 'next/cache'
import * as excelStorage from '@/lib/excel-storage'
import { getGoogleSheetsScriptUrl, postGoogleSheetsAction } from '@/lib/google-sheets'
import { categorySchema, flattenErrors, settingsSchema } from '@/lib/validation'
import type { ActionResult, TxType } from '@/lib/types'

export async function updateSettings(input: Record<string, string>): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: flattenErrors(parsed.error) }
  }

  try {
    if (getGoogleSheetsScriptUrl()) {
      await postGoogleSheetsAction({
        action: 'updateSettings',
        settings: parsed.data,
      })
    }

    await excelStorage.updateSettings(parsed.data as any)
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Settings saved to Google Sheet & Excel' }
  } catch (error: any) {
    console.error('[settings] update failed', error.message)
    return { ok: false, error: 'Could not save settings.' }
  }
}

export async function createCategory(input: { name: string; type: string }): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: flattenErrors(parsed.error) }
  }

  try {
    if (getGoogleSheetsScriptUrl()) {
      await postGoogleSheetsAction({
        action: 'addCategory',
        name: parsed.data.name,
        type: parsed.data.type,
      })
    }

    await excelStorage.createCategory({
      name: parsed.data.name,
      type: parsed.data.type as TxType,
    })
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Category added to Google Sheet & Excel' }
  } catch (error: any) {
    return { ok: false, error: error.message || 'Could not save category.' }
  }
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Invalid category.' }

  const parsed = categorySchema.shape.name.safeParse(name)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  try {
    await excelStorage.renameCategory(id, parsed.data)
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Category renamed' }
  } catch (error: any) {
    return { ok: false, error: error.message || 'Could not rename category.' }
  }
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Invalid category.' }

  try {
    await excelStorage.setCategoryActive(id, isActive)
    revalidatePath('/', 'layout')
    return { ok: true, message: isActive ? 'Category activated' : 'Category deactivated' }
  } catch (error: any) {
    return { ok: false, error: error.message || 'Could not change category status.' }
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Invalid category.' }

  try {
    await excelStorage.deleteCategory(id)
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Category deleted' }
  } catch (error: any) {
    return { ok: false, error: error.message || 'Could not delete category.' }
  }
}
