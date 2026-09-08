'use server'

import { revalidatePath } from 'next/cache'
import { createService, getServiceImagePath, setServiceActive, updateService } from './services'
import { deleteServiceImage, uploadServiceImage } from '@/lib/supabase/storage'
import { createFormula, setFormulaActive, updateFormula } from './formulas'
import { createStageTemplate, setStageTemplateActive, updateStageTemplate } from './stageTemplates'
import type { ServiceStageType } from '@prisma/client'

function num(formData: FormData, key: string): number | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number(value)
}

export interface UpsertServiceState {
  ok: boolean
  message?: string
}

/**
 * Crea o edita un servicio, incluyendo la foto: sube la nueva imagen (si se
 * adjuntó una), y solo tras subirla con éxito borra la anterior del bucket
 * (evita quedarse sin foto si la subida falla a medio camino). Si se pidió
 * "Eliminar foto actual" sin adjuntar una nueva, borra la existente.
 */
export async function upsertServiceWithImage(
  serviceId: string | null,
  _prevState: UpsertServiceState,
  formData: FormData
): Promise<UpsertServiceState> {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { ok: false, message: 'El nombre del servicio es obligatorio.' }

  const fields = {
    name,
    basePrice: num(formData, 'basePrice') ?? 0,
    standardDurationMin: num(formData, 'standardDurationMin') ?? 30,
    description: (formData.get('description') as string) || undefined,
  }

  const file = formData.get('image')
  const removeImage = formData.get('removeImage') === 'true'
  const previousImagePath = serviceId ? await getServiceImagePath(serviceId) : null

  let imageUpdate: { imageUrl?: string | null; imagePath?: string | null } = {}

  try {
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadServiceImage(file)
      if (previousImagePath) await deleteServiceImage(previousImagePath)
      imageUpdate = { imageUrl: uploaded.url, imagePath: uploaded.path }
    } else if (removeImage && previousImagePath) {
      await deleteServiceImage(previousImagePath)
      imageUpdate = { imageUrl: null, imagePath: null }
    }
  } catch (error) {
    console.error('[upsertServiceWithImage] falló el procesamiento de la imagen:', error)
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo procesar la imagen.' }
  }

  if (serviceId) {
    await updateService(serviceId, { ...fields, ...imageUpdate })
  } else {
    await createService({ ...fields, ...imageUpdate })
  }

  revalidatePath('/admin/servicios')
  revalidatePath('/book')
  revalidatePath('/client/citas')

  return { ok: true }
}

export async function deleteServiceAction(serviceId: string) {
  await setServiceActive(serviceId, false)
  revalidatePath('/admin/servicios')
  revalidatePath('/book')
}

function revalidateServiceDetail(serviceId: string) {
  revalidatePath(`/admin/servicios/${serviceId}`)
  revalidatePath('/admin/mise-en-place')
}

// --- Fórmulas cosméticas por servicio ---

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export async function createFormulaAction(serviceId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const productId = String(formData.get('productId') ?? '')
  const baseMlPerUse = num(formData, 'baseMlPerUse') ?? 30
  if (!name || !productId) return

  await createFormula(serviceId, {
    name,
    productId,
    baseMlPerUse,
    dilutionRatio: str(formData, 'dilutionRatio'),
    instructions: str(formData, 'instructions'),
  })
  revalidateServiceDetail(serviceId)
}

export async function updateFormulaAction(serviceId: string, formulaId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const productId = String(formData.get('productId') ?? '')
  const baseMlPerUse = num(formData, 'baseMlPerUse') ?? 30
  if (!name || !productId) return

  await updateFormula(formulaId, {
    name,
    productId,
    baseMlPerUse,
    dilutionRatio: str(formData, 'dilutionRatio'),
    instructions: str(formData, 'instructions'),
  })
  revalidateServiceDetail(serviceId)
}

export async function deleteFormulaAction(serviceId: string, formulaId: string) {
  await setFormulaActive(formulaId, false)
  revalidateServiceDetail(serviceId)
}

// --- Etapas estándar por servicio ---

export async function createStageTemplateAction(serviceId: string, formData: FormData) {
  const stageType = formData.get('stageType') as ServiceStageType
  const order = num(formData, 'order') ?? 0
  const standardDurationMin = num(formData, 'standardDurationMin') ?? 15
  if (!stageType) return

  await createStageTemplate(serviceId, { stageType, order, standardDurationMin })
  revalidateServiceDetail(serviceId)
}

export async function updateStageTemplateAction(serviceId: string, stageTemplateId: string, formData: FormData) {
  const stageType = formData.get('stageType') as ServiceStageType
  const order = num(formData, 'order') ?? 0
  const standardDurationMin = num(formData, 'standardDurationMin') ?? 15
  if (!stageType) return

  await updateStageTemplate(stageTemplateId, { stageType, order, standardDurationMin })
  revalidateServiceDetail(serviceId)
}

export async function deleteStageTemplateAction(serviceId: string, stageTemplateId: string) {
  await setStageTemplateActive(stageTemplateId, false)
  revalidateServiceDetail(serviceId)
}
