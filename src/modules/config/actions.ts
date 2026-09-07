'use server'

import { revalidatePath } from 'next/cache'
import {
  createEquipmentCategory,
  setEquipmentCategoryActive,
  updateEquipmentCategory,
} from './equipmentCategories'
import { updateBufferTimeMinutes, updatePaymentInfoText } from './settings'
import { updateBusinessHour } from './businessHours'
import {
  getBrandingAssetPath,
  setBrandingAsset,
  updateBranding,
  updateWhatsappTemplateOverride,
  type SocialLinks,
} from './branding'
import { deleteBrandingAssetFile, uploadBrandingAsset } from '@/lib/supabase/storage'
import {
  createProductCategory,
  createUnitOfMeasure,
  setProductCategoryActive,
  setUnitOfMeasureActive,
  updateProductCategory,
  updateUnitOfMeasure,
} from './productCatalogs'
import { createCustomerTag, setCustomerTagActive, setTutorTags, updateCustomerTag } from './customerTags'

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

function revalidateAgendaEverywhere() {
  revalidatePath('/admin/configuracion')
  revalidatePath('/book')
  revalidatePath('/client/citas')
  revalidatePath('/dashboard-tv')
}

export async function updateBufferTimeMinutesAction(formData: FormData) {
  const minutes = Number(formData.get('bufferTimeMinutes') ?? 15)
  if (!Number.isFinite(minutes) || minutes < 0) return
  await updateBufferTimeMinutes(Math.round(minutes))
  revalidateAgendaEverywhere()
}

export async function updateBusinessHourAction(dayOfWeek: number, formData: FormData) {
  const isOpen = formData.get('isOpen') === 'on'
  const openTime = String(formData.get('openTime') ?? '08:00')
  const closeTime = String(formData.get('closeTime') ?? '19:00')
  await updateBusinessHour(dayOfWeek, { isOpen, openTime, closeTime })
  revalidateAgendaEverywhere()
}

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function revalidateBrandingEverywhere() {
  // El logo/nombre/colores aparecen en los headers de /admin, /client y /dashboard-tv (y /book vía layout raíz).
  revalidatePath('/', 'layout')
}

export async function updateBrandingAction(formData: FormData) {
  const socialLinks: SocialLinks = {
    instagram: str(formData, 'instagram'),
    facebook: str(formData, 'facebook'),
    tiktok: str(formData, 'tiktok'),
    whatsapp: str(formData, 'whatsapp'),
  }

  await updateBranding({
    businessName: String(formData.get('businessName') ?? '').trim() || 'GroomingOS',
    slogan: str(formData, 'slogan'),
    officialPhone: str(formData, 'officialPhone'),
    address: str(formData, 'address'),
    currencyCode: String(formData.get('currencyCode') ?? 'CRC').trim() || 'CRC',
    socialLinks,
    primaryColor: String(formData.get('primaryColor') ?? '#0f172a'),
    secondaryColor: String(formData.get('secondaryColor') ?? '#64748b'),
    accentColor: String(formData.get('accentColor') ?? '#0ea5e9'),
    invoiceFooterText: str(formData, 'invoiceFooterText'),
  })
  revalidatePath('/admin/configuracion/branding')
  revalidateBrandingEverywhere()
}

export async function updateWhatsappTemplateOverrideAction(templateName: string, formData: FormData) {
  const text = String(formData.get('template') ?? '')
  await updateWhatsappTemplateOverride(templateName, text)
  revalidatePath('/admin/configuracion/branding')
}

export interface BrandingAssetState {
  ok: boolean
  message?: string
}

type BrandingAssetKind = 'logo' | 'favicon' | 'appIcon'

export async function uploadBrandingAssetAction(
  kind: BrandingAssetKind,
  _prevState: BrandingAssetState,
  formData: FormData
): Promise<BrandingAssetState> {
  const file = formData.get('image')
  const removeImage = formData.get('removeImage') === 'true'
  const previousPath = await getBrandingAssetPath(kind)

  try {
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadBrandingAsset(file)
      if (previousPath) await deleteBrandingAssetFile(previousPath)
      await setBrandingAsset(kind, uploaded.url, uploaded.path)
    } else if (removeImage && previousPath) {
      await deleteBrandingAssetFile(previousPath)
      await setBrandingAsset(kind, null, null)
    } else {
      return { ok: false, message: 'Selecciona una imagen primero.' }
    }
  } catch (error) {
    console.error('[uploadBrandingAssetAction] falló la subida del asset de marca:', error)
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo subir la imagen.' }
  }

  revalidatePath('/admin/configuracion/branding')
  revalidateBrandingEverywhere()
  return { ok: true }
}

// --- Categorías de producto ---

export async function createProductCategoryAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  await createProductCategory({ name, sortOrder: num(formData, 'sortOrder') })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/inventario')
}

export async function updateProductCategoryAction(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  await updateProductCategory(id, { name, sortOrder: num(formData, 'sortOrder') })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/inventario')
}

export async function deleteProductCategoryAction(id: string) {
  await setProductCategoryActive(id, false)
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/inventario')
}

// --- Unidades de medida ---

export async function createUnitOfMeasureAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const abbreviation = String(formData.get('abbreviation') ?? '').trim()
  if (!name || !abbreviation) return
  await createUnitOfMeasure({ name, abbreviation, sortOrder: num(formData, 'sortOrder') })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/inventario')
}

export async function updateUnitOfMeasureAction(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const abbreviation = String(formData.get('abbreviation') ?? '').trim()
  if (!name || !abbreviation) return
  await updateUnitOfMeasure(id, { name, abbreviation, sortOrder: num(formData, 'sortOrder') })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/inventario')
}

export async function deleteUnitOfMeasureAction(id: string) {
  await setUnitOfMeasureActive(id, false)
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/inventario')
}

// --- Etiquetas de clientes ---

export async function createCustomerTagAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const color = String(formData.get('color') ?? '#64748b')
  await createCustomerTag({ name, color })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/clientes')
}

export async function updateCustomerTagAction(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const color = String(formData.get('color') ?? '#64748b')
  await updateCustomerTag(id, { name, color })
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/clientes')
}

export async function deleteCustomerTagAction(id: string) {
  await setCustomerTagActive(id, false)
  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/clientes')
}

export async function updateTutorTagsAction(tutorId: string, formData: FormData) {
  const tagIds = formData.getAll('tagIds').map(String)
  await setTutorTags(tutorId, tagIds)
  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${tutorId}`)
}
