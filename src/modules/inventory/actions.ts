'use server'

import { revalidatePath } from 'next/cache'
import { EquipmentStatus, InstrumentType } from '@prisma/client'
import { createEquipment, flagEquipmentStatus, logMaintenance, softDeleteEquipment, updateEquipment } from './equipment'
import { createInstrument, markInstrumentSharpened, retireInstrument } from './instruments'
import { createProduct, restockProduct, softDeleteProduct, updateProduct } from './products'
import { closeServiceInventory } from './serviceClosure'

function num(formData: FormData, key: string): number | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number(value)
}

export async function createProductAction(formData: FormData) {
  await createProduct({
    name: String(formData.get('name')),
    categoryId: (formData.get('categoryId') as string) || undefined,
    unitId: (formData.get('unitId') as string) || undefined,
    stockCurrent: num(formData, 'stockCurrent') ?? 0,
    stockMin: num(formData, 'stockMin') ?? 0,
    costPerUnit: num(formData, 'costPerUnit') ?? 0,
    supplier: (formData.get('supplier') as string) || undefined,
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
  await updateProduct(productId, {
    name: String(formData.get('name') ?? ''),
    categoryId: (formData.get('categoryId') as string) || undefined,
    unitId: (formData.get('unitId') as string) || undefined,
    stockMin: num(formData, 'stockMin') ?? 0,
    costPerUnit: num(formData, 'costPerUnit') ?? 0,
    supplier: (formData.get('supplier') as string) || undefined,
  })
  revalidatePath('/admin/inventario')
}

export async function deleteProductAction(productId: string) {
  await softDeleteProduct(productId)
  revalidatePath('/admin/inventario')
}

export async function createInstrumentAction(formData: FormData) {
  await createInstrument({
    name: String(formData.get('name')),
    type: formData.get('type') as InstrumentType,
    expectedLifeHours: num(formData, 'expectedLifeHours'),
    expectedLifeUses: num(formData, 'expectedLifeUses'),
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
