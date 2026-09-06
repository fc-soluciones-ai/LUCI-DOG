import 'server-only'
import { randomUUID } from 'node:crypto'
import { createSupabaseAdminClient } from './admin'

// Debe coincidir con MAX_UPLOAD_BYTES en src/lib/client/imageUpload.ts y con
// experimental.serverActions.bodySizeLimit en next.config.mjs.
const MAX_SIZE_BYTES = 4 * 1024 * 1024

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const RECEIPT_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  'application/pdf': 'pdf',
}

export interface UploadedFile {
  url: string
  path: string
}

async function uploadToBucket(bucket: string, file: File, allowedTypes: Record<string, string>): Promise<UploadedFile> {
  const extension = allowedTypes[file.type]
  if (!extension) {
    const label = allowedTypes === RECEIPT_TYPES ? 'JPG, PNG, WEBP o PDF' : 'JPG, PNG o WEBP'
    throw new Error(`Formato no soportado. Usa ${label}.`)
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`El archivo supera el tamaño máximo de ${MAX_SIZE_BYTES / (1024 * 1024)} MB.`)
  }

  const path = `${randomUUID()}.${extension}`

  let admin: ReturnType<typeof createSupabaseAdminClient>
  try {
    admin = createSupabaseAdminClient()
  } catch (error) {
    console.error(`[storage:${bucket}] Cliente de Supabase Storage no disponible:`, error)
    throw new Error('El almacenamiento no está disponible en este momento. Intenta de nuevo en unos minutos.')
  }

  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    console.error(`[storage:${bucket}] Falló la subida:`, error)
    throw new Error('No se pudo subir el archivo. Intenta de nuevo en unos minutos.')
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

async function deleteFromBucket(bucket: string, path: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  await admin.storage.from(bucket).remove([path])
}

/**
 * Sube una imagen de servicio a Supabase Storage (bucket público `services-images`),
 * validando tipo y tamaño. El nombre del archivo es un UUID — nunca el nombre
 * original del usuario, evita colisiones y filtración de nombres de archivo.
 */
export async function uploadServiceImage(file: File): Promise<UploadedFile> {
  return uploadToBucket('services-images', file, IMAGE_TYPES)
}

/** Elimina una imagen previa del bucket — no lanza si ya no existe (idempotente). */
export async function deleteServiceImage(path: string): Promise<void> {
  return deleteFromBucket('services-images', path)
}

/** Comprobante de pago (SINPE/transferencia) — acepta imagen o PDF. */
export async function uploadPaymentReceipt(file: File): Promise<UploadedFile> {
  return uploadToBucket('payment-receipts', file, RECEIPT_TYPES)
}

export async function deletePaymentReceipt(path: string): Promise<void> {
  return deleteFromBucket('payment-receipts', path)
}

/** Foto de perfil de mascota, subida desde el Portal del Cliente (cámara o galería). */
export async function uploadPetPhoto(file: File): Promise<UploadedFile> {
  return uploadToBucket('pets-photos', file, IMAGE_TYPES)
}

/** Nombrado distinto de crm/pets.ts#deletePetPhoto (esa borra la fila PetPhoto; esta borra el archivo del bucket). */
export async function deletePetPhotoFile(path: string): Promise<void> {
  return deleteFromBucket('pets-photos', path)
}

/** Logo / favicon / ícono de PWA del White Label (bucket `branding-assets`). */
export async function uploadBrandingAsset(file: File): Promise<UploadedFile> {
  return uploadToBucket('branding-assets', file, IMAGE_TYPES)
}

export async function deleteBrandingAssetFile(path: string): Promise<void> {
  return deleteFromBucket('branding-assets', path)
}
