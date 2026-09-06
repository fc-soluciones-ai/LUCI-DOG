'use server'

import { revalidatePath } from 'next/cache'
import { createService, setServiceActive, updateService } from './services'

function num(formData: FormData, key: string): number | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number(value)
}

export async function createServiceAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  await createService({
    name,
    basePrice: num(formData, 'basePrice') ?? 0,
    standardDurationMin: num(formData, 'standardDurationMin') ?? 30,
    description: (formData.get('description') as string) || undefined,
  })
  revalidatePath('/admin/servicios')
  revalidatePath('/book')
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  await updateService(serviceId, {
    name,
    basePrice: num(formData, 'basePrice') ?? 0,
    standardDurationMin: num(formData, 'standardDurationMin') ?? 30,
    description: (formData.get('description') as string) || undefined,
  })
  revalidatePath('/admin/servicios')
  revalidatePath('/book')
}

export async function deleteServiceAction(serviceId: string) {
  await setServiceActive(serviceId, false)
  revalidatePath('/admin/servicios')
  revalidatePath('/book')
}
