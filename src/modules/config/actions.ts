'use server'

import { revalidatePath } from 'next/cache'
import {
  createEquipmentCategory,
  setEquipmentCategoryActive,
  updateEquipmentCategory,
} from './equipmentCategories'
import { updatePaymentInfoText } from './settings'

function num(formData: FormData, key: string): number | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number(value)
}

export async function createEquipmentCategoryAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  await createEquipmentCategory({ name, sortOrder: num(formData, 'sortOrder') })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/equipos')
}

export async function updateEquipmentCategoryAction(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  await updateEquipmentCategory(id, { name, sortOrder: num(formData, 'sortOrder') })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/equipos')
}

export async function deleteEquipmentCategoryAction(id: string) {
  await setEquipmentCategoryActive(id, false)
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/equipos')
}

export async function updatePaymentInfoTextAction(formData: FormData) {
  const text = String(formData.get('paymentInfoText') ?? '').trim()
  await updatePaymentInfoText(text)
  revalidatePath('/admin/configuracion')
  revalidatePath('/client/facturas')
}
