'use server'

import { revalidatePath } from 'next/cache'
import { EquipmentStatus, InstrumentType } from '@prisma/client'
import { createEquipment, flagEquipmentStatus, logMaintenance, softDeleteEquipment, updateEquipment } from './equipment'
import { createInstrument, getInstrumentImagePath, markInstrumentSharpened, retireInstrument, updateInstrument } from './instruments'
import { createProduct, getProductImagePath, restockProduct, softDeleteProduct, updateProduct } from './products'
import { closeServiceInventory } from './serviceClosure'
import { deleteInstrumentImage, deleteProductImage, uploadInstrumentImage, uploadProductImage } from '@/lib/supabase/storage'

function num(formData: FormData, key: string): number | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number(value)
}

/** Imagen en un alta: sube el archivo si viene uno, si no deja el campo tal cual (sin foto). */
async function resolveNewImage(formData: FormData, uploadFn: (file: File) => Promise<{ url: string; path: string }>) {
  const file = formData.get('image')
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadFn(file)
    return { imageUrl: uploaded.url, imagePath: uploaded.path }
  }
  return {}
}

/** Imagen en una edición: reemplaza (borrando la anterior), quita (checkbox "Eliminar foto"), o deja igual. */
async function resolveImageUpdate(
  formData: FormData,
  previousPath: string | null,
  uploadFn: (file: File) => Promise<{ url: string; path: string }>,
  deleteFn: (path: string) => Promise<void>
): Promise<{ imageUrl?: string | null; imagePath?: string | null }> {
  const file = formData.get('image')
  const removeImage = formData.get('removeImage') === 'true'

  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadFn(file)
    if (previousPath) await deleteFn(previousPath)
    return { imageUrl: uploaded.url, imagePath: uploaded.path }
  }
  if (removeImage && previousPath) {
    await deleteFn(previousPath)
    return { imageUrl: null, imagePath: null }
  }
  return {}
}

export async function createProductAction(formData: FormData) {
  const imageUpdate = await resolveNewImage(formData, uploadProductImage)
  await createProduct({
    name: String(formData.get('name')),
    categoryId: (formData.get('categoryId') as string) || undefined,
    unitId: (formData.get('unitId') as string) || undefined,
    stockCurrent: num(formData, 'stockCurrent') ?? 0,
    stockMin: num(formData, 'stockMin') ?? 0,
    costPerUnit: num(formData, 'costPerUnit') ?? 0,
    supplier: (formData.get('supplier') as string) || undefined,
    ...imageUpdate,
  })
  revalidatePath('/admin/inventario')
}

export async function restockProductAction(productId: string, formData: FormData) {
  const quantity = num(formData, 'quantity')
  if (!quantity || quantity <= 0) return
  await restockProduct(productId, quantity)
  revalidatePath('/admin/inventario')
}

export async function updateProductAction(productId: string, formData: FormData) {
  const previousPath = await getProductImagePath(productId)
  const imageUpdate = await resolveImageUpdate(formData, previousPath, uploadProductImage, deleteProductImage)

  await updateProduct(productId, {
    name: String(formData.get('name') ?? ''),
    categoryId: (formData.get('categoryId') as string) || undefined,
    unitId: (formData.get('unitId') as string) || undefined,
    stockMin: num(formData, 'stockMin') ?? 0,
    costPerUnit: num(formData, 'costPerUnit') ?? 0,
    supplier: (formData.get('supplier') as string) || undefined,
    ...imageUpdate,
  })
  revalidatePath('/admin/inventario')
}

export async function deleteProductAction(productId: string) {
  await softDeleteProduct(productId)
  revalidatePath('/admin/inventario')
}

export async function createInstrumentAction(formData: FormData) {
  const imageUpdate = await resolveNewImage(formData, uploadInstrumentImage)
  await createInstrument({
    name: String(formData.get('name')),
    type: formData.get('type') as InstrumentType,
    expectedLifeHours: num(formData, 'expectedLifeHours'),
    expectedLifeUses: num(formData, 'expectedLifeUses'),
    ...imageUpdate,
  })
  revalidatePath('/admin/inventario')
}

export async function updateInstrumentAction(instrumentId: string, formData: FormData) {
  const previousPath = await getInstrumentImagePath(instrumentId)
  const imageUpdate = await resolveImageUpdate(formData, previousPath, uploadInstrumentImage, deleteInstrumentImage)

  await updateInstrument(instrumentId, {
    name: String(formData.get('name') ?? ''),
    type: formData.get('type') as InstrumentType,
    expectedLifeHours: num(formData, 'expectedLifeHours'),
    expectedLifeUses: num(formData, 'expectedLifeUses'),
    ...imageUpdate,
  })
  revalidatePath('/admin/inventario')
}

export async function markInstrumentSharpenedAction(instrumentId: string) {
  await markInstrumentSharpened(instrumentId)
  revalidatePath('/admin/inventario')
}

export async function retireInstrumentAction(instrumentId: string) {
  await retireInstrument(instrumentId)
  revalidatePath('/admin/inventario')
}

export async function createEquipmentAction(formData: FormData) {
  await createEquipment({
    name: String(formData.get('name')),
    categoryId: (formData.get('categoryId') as string) || undefined,
    supplier: (formData.get('supplier') as string) || undefined,
    purchaseDate: formData.get('purchaseDate') ? new Date(String(formData.get('purchaseDate'))) : undefined,
    purchaseCost: num(formData, 'purchaseCost') ?? 0,
    usefulLifeMonths: num(formData, 'usefulLifeMonths') ?? 12,
    maintenanceFrequencyMonths: num(formData, 'maintenanceFrequencyMonths'),
  })
  revalidatePath('/admin/equipos')
}

export async function logMaintenanceAction(equipmentId: string, formData: FormData) {
  const description = String(formData.get('description') ?? '')
  if (!description) return
  const cost = num(formData, 'cost')
  const nextDueInDays = num(formData, 'nextDueInDays') ?? 90
  await logMaintenance(equipmentId, description, cost, nextDueInDays)
  revalidatePath('/admin/equipos')
}

export async function flagEquipmentStatusAction(equipmentId: string, status: EquipmentStatus) {
  await flagEquipmentStatus(equipmentId, status)
  revalidatePath('/admin/equipos')
}

export async function updateEquipmentAction(equipmentId: string, formData: FormData) {
  await updateEquipment(equipmentId, {
    name: String(formData.get('name') ?? ''),
    brand: (formData.get('brand') as string) || undefined,
    model: (formData.get('model') as string) || undefined,
    serialNumber: (formData.get('serialNumber') as string) || undefined,
    categoryId: (formData.get('categoryId') as string) || undefined,
    supplier: (formData.get('supplier') as string) || undefined,
    maintenanceFrequencyMonths: num(formData, 'maintenanceFrequencyMonths'),
    status: formData.get('status') as EquipmentStatus,
    lastMaintenanceAt: formData.get('lastMaintenanceAt') ? new Date(String(formData.get('lastMaintenanceAt'))) : undefined,
    notes: (formData.get('notes') as string) || undefined,
  })
  revalidatePath('/admin/equipos')
}

export async function deleteEquipmentAction(equipmentId: string) {
  await softDeleteEquipment(equipmentId)
  revalidatePath('/admin/equipos')
}

/** Envía el cierre de inventario de una cita completada (Módulo 5). */
export async function closeServiceInventoryAction(appointmentId: string, formData: FormData) {
  const formulaEntries: { formulaId: string; mlUsed: number }[] = []
  const instrumentEntries: { instrumentId: string; minutesUsed: number }[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('formula_')) {
      const formulaId = key.replace('formula_', '')
      const mlUsed = Number(value)
      if (mlUsed > 0) formulaEntries.push({ formulaId, mlUsed })
    }

    if (key.startsWith('instrument_')) {
      const type = key.replace('instrument_', '')
      const instrumentId = String(value)
      if (!instrumentId) continue
      const minutesUsed = Number(formData.get(`minutes_${type}`) ?? 0)
      if (minutesUsed > 0) instrumentEntries.push({ instrumentId, minutesUsed })
    }
  }

  await closeServiceInventory(appointmentId, formulaEntries, instrumentEntries)
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/mascotas')
}
