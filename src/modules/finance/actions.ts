'use server'

import { revalidatePath } from 'next/cache'
import type { ExpenseFrequency } from '@prisma/client'
import { createFixedExpense, setFixedExpenseActive } from './expenses'

export async function createFixedExpenseAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const amount = Number(formData.get('amount'))
  if (!name || !(amount > 0)) return

  await createFixedExpense({
    name,
    category: String(formData.get('category') ?? 'General'),
    amount,
    frequency: formData.get('frequency') as ExpenseFrequency,
    effectiveFrom: formData.get('effectiveFrom') ? new Date(String(formData.get('effectiveFrom'))) : new Date(),
  })
  revalidatePath('/admin/reportes')
}

export async function setFixedExpenseActiveAction(id: string, active: boolean) {
  await setFixedExpenseActive(id, active)
  revalidatePath('/admin/reportes')
}
